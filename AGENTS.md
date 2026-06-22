# OpenGeoLab Agent Notes

## Case Publishing Policy

- New public case additions should be created and published on the production server only.
- Do not add large new case seed directories, generated notebooks, datasets, covers, or output assets to the local workspace unless the user explicitly asks for a local copy.
- The local repository should stay lightweight; avoid using it as a staging area for bulk case generation.
- When publishing cases, distinguish between:
  - server-side `case-seeds` content, and
  - public case projects materialized under the server `jupyter-data` area.
- After adding cases on the server, run the server-side seed publishing flow and verify the public API returns the expected cases.
- Verification should include total count, duplicate titles/project IDs, detail endpoints, and thumbnail/file preview URLs.

## Production Deployment Reminder

- The production site is mounted at `/OpenGeoLab/`.
- Production frontend builds must preserve the public base path:

```bash
VITE_PUBLIC_BASE_PATH=/OpenGeoLab/ VITE_API_BASE_URL=/OpenGeoLab npm run build
```

- A build that references `/assets/...` instead of `/OpenGeoLab/assets/...` is incorrect for production.
- Frontend API requests in production should resolve to `/OpenGeoLab/api/...`, not root `/api/...`.
