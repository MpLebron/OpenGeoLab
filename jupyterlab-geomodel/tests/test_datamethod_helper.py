import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

from jupyterlab_geomodel.datamethod import run_datamethod


class FakeResponse:
    def __init__(self, payload=None, content=b"", status_code=200):
        self._payload = payload or {}
        self.content = content
        self.status_code = status_code

    def json(self):
        return self._payload

    def raise_for_status(self):
        if self.status_code >= 400:
            raise RuntimeError(f"HTTP {self.status_code}")


class DataMethodHelperTests(unittest.TestCase):
    def test_runs_data_method_with_file_upload_and_downloads_outputs(self):
        with tempfile.TemporaryDirectory() as tmp:
            workdir = Path(tmp)
            input_path = workdir / "input.tif"
            input_path.write_bytes(b"raster")

            def fake_get(url, **kwargs):
                if url.endswith("/datamethods/info/AbsoluteValue"):
                    return FakeResponse({
                        "code": 0,
                        "method": {"id": 7},
                        "paramType": {
                            "FileInput": ["input"],
                            "Output": ["output"],
                            "ParamInput": ["scale"]
                        }
                    })
                if url == "http://data.example/out-file":
                    return FakeResponse(content=b"result")
                raise AssertionError(f"Unexpected GET {url}")

            def fake_post(url, **kwargs):
                if url.endswith("/upload"):
                    return FakeResponse({"status": "success", "id": "uploaded-file-id"})
                if url.endswith("/datamethods/run"):
                    body = json.loads(kwargs["data"])
                    self.assertEqual(body, {
                        "modelId": 7,
                        "inputs": {
                            "input": "uploaded-file-id",
                            "output": "absolute_output",
                            "scale": 2
                        }
                    })
                    return FakeResponse({
                        "status": "success",
                        "output": {"output": ["http://data.example/out-file"]},
                        "info": "ok"
                    })
                raise AssertionError(f"Unexpected POST {url}")

            session = Mock()
            session.get.side_effect = fake_get
            session.post.side_effect = fake_post

            result = run_datamethod(
                "AbsoluteValue",
                params={
                    "input": input_path,
                    "output": "absolute_output.tif",
                    "scale": 2
                },
                api_base="http://opengeolab.test/api",
                output_dir=workdir / "results",
                session=session
            )

            self.assertEqual(result["status"], "success")
            self.assertEqual(result["inputs"]["input"], "uploaded-file-id")
            self.assertEqual(result["inputs"]["output"], "absolute_output")
            self.assertEqual(result["outputs"]["output"][0], str(workdir / "results" / "absolute_output.tif"))
            self.assertEqual((workdir / "results" / "absolute_output.tif").read_bytes(), b"result")

    def test_raises_clear_error_when_data_method_api_fails(self):
        session = Mock()
        session.get.return_value = FakeResponse({
            "code": 0,
            "method": {"id": "broken"},
            "paramType": {"FileInput": [], "Output": [], "ParamInput": []}
        })
        session.post.return_value = FakeResponse({"status": "error", "message": "boom"})

        with self.assertRaisesRegex(RuntimeError, "boom"):
            run_datamethod(
                "BrokenMethod",
                params={},
                api_base="http://opengeolab.test/api",
                session=session
            )

    def test_raises_when_output_download_fails(self):
        def fake_get(url, **kwargs):
            if url.endswith("/datamethods/info/DownloadBroken"):
                return FakeResponse({
                    "code": 0,
                    "method": {"id": 9},
                    "paramType": {
                        "FileInput": [],
                        "Output": ["output"],
                        "ParamInput": []
                    }
                })
            if url == "http://data.example/missing":
                return FakeResponse(status_code=500)
            raise AssertionError(f"Unexpected GET {url}")

        def fake_post(url, **kwargs):
            return FakeResponse({
                "status": "success",
                "output": {"output": ["http://data.example/missing"]}
            })

        session = Mock()
        session.get.side_effect = fake_get
        session.post.side_effect = fake_post

        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaisesRegex(RuntimeError, "HTTP 500"):
                run_datamethod(
                    "DownloadBroken",
                    params={"output": "broken.tif"},
                    api_base="http://opengeolab.test/api",
                    output_dir=Path(tmp),
                    session=session
                )

    def test_uses_environment_api_base_by_default(self):
        session = Mock()
        session.get.return_value = FakeResponse({
            "code": 0,
            "method": {"id": 1},
            "paramType": {"FileInput": [], "Output": [], "ParamInput": []}
        })
        session.post.return_value = FakeResponse({"status": "success", "output": {}})

        with patch.dict("os.environ", {"OPENGEOLAB_API": "http://env.example/api"}):
            run_datamethod("Noop", params={}, session=session)

        self.assertTrue(session.get.call_args[0][0].startswith("http://env.example/api/"))


if __name__ == "__main__":
    unittest.main()
