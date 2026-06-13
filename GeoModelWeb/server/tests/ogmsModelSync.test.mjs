import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

const {
  createOgmsModelSyncService,
  resetOgmsModelDailySyncScheduler,
  startOgmsModelDailySync
} = require('../services/ogmsModelSyncService.js')

const {
  countOgmsModels,
  findOgmsModelDetail,
  getOgmsModelFacets,
  listOgmsModels
} = require('../db/ogmsModelsRepository.js')

const URBAN_MODEL_ID = 'd65631a5-9e1a-4450-9487-640c5a6494c2'
const URBAN_MODEL_MD5 = '91ba158741b1040f05a7b6be78596265'

const SAMPLE_MDL = `
<ModelClass>
  <Behavior>
    <RelatedDatasets>
      <DatasetItem name="research_range" type="external" />
      <DatasetItem name="st_year_dataset" type="internal">
        <UdxDeclaration>
          <UdxNode>
            <UdxNode name="st_year" type="int" description="Starting simulation year" />
          </UdxNode>
        </UdxDeclaration>
      </DatasetItem>
    </RelatedDatasets>
    <StateGroup>
      <States>
        <State name="Get_basic_data">
          <Event name="Get_research_range" type="response" optional="false" description="获取研究区范围数据">
            <ResponseParameter datasetReference="research_range" />
          </Event>
        </State>
        <State name="Set_runtime">
          <Event name="Set_year" type="response" optional="False" description="设置模拟年份">
            <ResponseParameter datasetReference="st_year_dataset" />
          </Event>
        </State>
      </States>
    </StateGroup>
  </Behavior>
</ModelClass>`

class FakeCollection {
  constructor(docs = []) {
    this.docs = docs
  }

  async countDocuments(query = {}) {
    return this.docs.filter(doc => matchesQuery(doc, query)).length
  }

  find(query = {}) {
    let items = this.docs.filter(doc => matchesQuery(doc, query))
    return {
      sort(sortSpec = {}) {
        const entries = Object.entries(sortSpec)
        items = items.slice().sort((left, right) => {
          for (const [key, direction] of entries) {
            const leftValue = left[key] ?? ''
            const rightValue = right[key] ?? ''
            if (leftValue === rightValue) continue
            return leftValue > rightValue ? direction : -direction
          }
          return 0
        })
        return this
      },
      skip(count) {
        items = items.slice(count)
        return this
      },
      limit(count) {
        items = items.slice(0, count)
        return this
      },
      async toArray() {
        return items.map(clone)
      }
    }
  }

  async findOne(query = {}) {
    return clone(this.docs.find(doc => matchesQuery(doc, query)) || null)
  }

  async updateOne(filter, update, options = {}) {
    const index = this.docs.findIndex(doc => matchesQuery(doc, filter))
    if (index >= 0) {
      this.docs[index] = { ...this.docs[index], ...clone(update.$set || {}) }
      return { matchedCount: 1, modifiedCount: 1, upsertedCount: 0 }
    }
    if (options.upsert) {
      this.docs.push({ ...clone(filter), ...clone(update.$set || {}) })
      return { matchedCount: 0, modifiedCount: 0, upsertedCount: 1 }
    }
    return { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 }
  }

  async insertOne(doc) {
    this.docs.push(clone(doc))
    return { insertedId: doc.id || doc._id || this.docs.length }
  }

  aggregate() {
    const counts = new Map()
    this.docs.forEach(doc => {
      ;(doc.tags || []).forEach(tag => counts.set(tag, (counts.get(tag) || 0) + 1))
    })
    const rows = Array.from(counts.entries()).map(([label, count]) => ({ label, count }))
    return {
      async toArray() {
        return rows
      }
    }
  }
}

class FakeDb {
  constructor(seed = {}) {
    this.collections = new Map(Object.entries(seed).map(([name, docs]) => [name, new FakeCollection(docs)]))
  }

  collection(name) {
    if (!this.collections.has(name)) {
      this.collections.set(name, new FakeCollection())
    }
    return this.collections.get(name)
  }
}

function clone(value) {
  return value ? JSON.parse(JSON.stringify(value)) : value
}

function matchesQuery(doc, query) {
  if (!query || Object.keys(query).length === 0) return true
  if (query.$or) return query.$or.some(part => matchesQuery(doc, part))
  if (query.$and) return query.$and.every(part => matchesQuery(doc, part))

  return Object.entries(query).every(([key, expected]) => {
    const actual = doc[key]
    if (expected && typeof expected === 'object' && expected.$in) {
      return expected.$in.includes(actual)
    }
    if (expected && typeof expected === 'object' && expected.$ne !== undefined) {
      return actual !== expected.$ne
    }
    if (expected instanceof RegExp) {
      return expected.test(String(actual || ''))
    }
    return actual === expected
  })
}

function createUrbanClient({ mdl = SAMPLE_MDL } = {}) {
  const calls = []
  return {
    calls,
    async post(url, body) {
      calls.push({ method: 'post', url, body })
      return {
        data: {
          data: {
            total: 1,
            content: [{
              id: URBAN_MODEL_ID,
              name: 'UrbanM2M城市扩张模拟模型',
              md5: URBAN_MODEL_MD5,
              viewCount: 8,
              lastModifyTime: '2026-03-11 15:40:11'
            }]
          }
        }
      }
    },
    async get(url) {
      calls.push({ method: 'get', url })
      return {
        data: {
          data: {
            id: URBAN_MODEL_ID,
            name: 'UrbanM2M城市扩张模拟模型',
            md5: URBAN_MODEL_MD5,
            overview: 'ConvLSTM based urban expansion simulation.',
            author: 'Wanhao.Li',
            itemClassifications: ['a24cba2b-9ce1-44de-ac68-8ec36a535d0e'],
            mdl,
            lastModifyTime: '2026-03-11 15:40:11',
            deploy: true,
            checkedModel: { online: true, msg: '正常' },
            invokeCount: 3
          }
        }
      }
    }
  }
}

test('syncs deployed OpenGMS models into MongoDB using md5 detail URLs', async () => {
  const db = new FakeDb()
  const client = createUrbanClient()
  const service = createOgmsModelSyncService({
    db,
    httpClient: client,
    deployedModelUrl: 'http://portal/managementSystem/deployedModel?token=masked',
    now: () => new Date('2026-06-03T00:00:00.000Z'),
    logger: silentLogger
  })

  const result = await service.syncOgmsModels({ reason: 'test' })
  const detailCall = client.calls.find(call => call.method === 'get')
  const stored = await findOgmsModelDetail(db, URBAN_MODEL_ID)

  assert.equal(result.successCount, 1)
  assert.equal(detailCall.url, `/computableModel/ModelInfoAndClassifications_pid/${URBAN_MODEL_MD5}`)
  assert.equal(stored.sourceId, URBAN_MODEL_ID)
  assert.equal(stored.md5, URBAN_MODEL_MD5)
  assert.equal(stored.name, 'UrbanM2M城市扩张模拟模型')
  assert.deepEqual(stored.tags, ['Land regions'])
  assert.equal(stored.normalizedInputs.length, 2)
  assert.equal(stored.normalizedInputs[0].event, 'Get_research_range')
  assert.equal(stored.normalizedInputs[1].children[0].eventName, 'st_year')
  assert.equal(stored.parameterParseStatus, 'parsed')
})

test('lists, facets, and finds OpenGMS models from MongoDB by name, uuid, and md5', async () => {
  const db = new FakeDb()
  const client = createUrbanClient()
  const service = createOgmsModelSyncService({
    db,
    httpClient: client,
    deployedModelUrl: 'http://portal/managementSystem/deployedModel?token=masked',
    now: () => new Date('2026-06-03T00:00:00.000Z'),
    logger: silentLogger
  })
  await service.syncOgmsModels({ reason: 'test' })

  const listed = await listOgmsModels(db, { query: 'UrbanM2M', page: 1, limit: 10 })
  const byName = await findOgmsModelDetail(db, 'UrbanM2M城市扩张模拟模型')
  const byUuid = await findOgmsModelDetail(db, URBAN_MODEL_ID)
  const byMd5 = await findOgmsModelDetail(db, URBAN_MODEL_MD5)
  const facets = await getOgmsModelFacets(db, {})

  assert.equal(await countOgmsModels(db), 1)
  assert.equal(listed.source, 'db')
  assert.equal(listed.total, 1)
  assert.equal(listed.data[0].id, URBAN_MODEL_ID)
  assert.equal(listed.data[0].externalUrl, `https://geomodeling.njnu.edu.cn/computableModel/${URBAN_MODEL_ID}`)
  assert.equal(byName.md5, URBAN_MODEL_MD5)
  assert.equal(byUuid.name, 'UrbanM2M城市扩张模拟模型')
  assert.equal(byMd5.sourceId, URBAN_MODEL_ID)
  assert.deepEqual(facets.domains, [{ label: 'Land regions', count: 1 }])
})

test('filters MongoDB model lists to the executable PyGeoModel registry when provided', async () => {
  const db = new FakeDb({
    ogms_models: [
      {
        source: 'opengms',
        sourceId: URBAN_MODEL_ID,
        id: URBAN_MODEL_ID,
        model_id: URBAN_MODEL_ID,
        md5: URBAN_MODEL_MD5,
        name: 'UrbanM2M城市扩张模拟模型',
        displayName: 'UrbanM2M城市扩张模拟模型',
        description: 'Registered model.',
        author: 'Wanhao.Li',
        tags: ['Land regions']
      },
      {
        source: 'opengms',
        sourceId: 'not-in-csv',
        id: 'not-in-csv',
        model_id: 'not-in-csv',
        md5: 'not-in-csv-md5',
        name: 'Internal model not in registry',
        displayName: 'Internal model not in registry',
        description: 'Should not appear in the Jupyter model browser.',
        author: 'OpenGMS',
        tags: ['Land regions']
      }
    ]
  })

  const listed = await listOgmsModels(db, {
    page: 1,
    limit: 10,
    registryFilter: {
      ids: [URBAN_MODEL_ID],
      md5s: [],
      names: [],
      displayNames: []
    }
  })

  assert.equal(listed.total, 1)
  assert.equal(listed.data[0].id, URBAN_MODEL_ID)
})

test('records parse errors without blocking model storage', async () => {
  const db = new FakeDb()
  const client = createUrbanClient({ mdl: '<ModelClass><broken></ModelClass>' })
  const service = createOgmsModelSyncService({
    db,
    httpClient: client,
    deployedModelUrl: 'http://portal/managementSystem/deployedModel?token=masked',
    now: () => new Date('2026-06-03T00:00:00.000Z'),
    logger: silentLogger
  })

  const result = await service.syncOgmsModels({ reason: 'test' })
  const stored = await findOgmsModelDetail(db, URBAN_MODEL_ID)

  assert.equal(result.successCount, 1)
  assert.equal(stored.parameterParseStatus, 'failed')
  assert.match(stored.syncError, /MDL parse failed/)
  assert.deepEqual(stored.normalizedInputs, [])
})

test('daily scheduler registers once and triggers startup sync for an empty catalog', async () => {
  resetOgmsModelDailySyncScheduler()
  const scheduled = []
  let syncCalls = 0
  const service = {
    async syncOgmsModels(options) {
      syncCalls += 1
      assert.equal(options.reason, 'startup-empty')
    }
  }

  const first = startOgmsModelDailySync({
    countModels: async () => 0,
    syncService: service,
    setTimeoutFn: (fn, delay) => {
      scheduled.push({ fn, delay })
      return scheduled.length
    },
    clearTimeoutFn: () => {},
    nowFn: () => new Date('2026-06-03T02:00:00.000Z'),
    logger: silentLogger
  })
  const second = startOgmsModelDailySync({
    countModels: async () => 0,
    syncService: service,
    setTimeoutFn: () => {
      throw new Error('second scheduler should not register a timer')
    },
    clearTimeoutFn: () => {},
    logger: silentLogger
  })

  await new Promise(resolve => setImmediate(resolve))

  assert.equal(first.started, true)
  assert.equal(second.started, false)
  assert.equal(scheduled.length, 1)
  assert.ok(scheduled[0].delay > 0)
  assert.equal(syncCalls, 1)
  resetOgmsModelDailySyncScheduler()
})

const silentLogger = {
  info() {},
  warn() {},
  error() {}
}
