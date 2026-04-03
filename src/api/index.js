import axios from 'axios'

const BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3'

function getClient(apiKey) {
  return axios.create({
    baseURL: BASE_URL,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    timeout: 30000
  })
}

// 创建视频生成任务
export async function createTask(apiKey, params) {
  const client = getClient(apiKey)
  const { data } = await client.post('/contents/generations/tasks', params)
  return data
}

// 查询单个任务
export async function getTask(apiKey, taskId) {
  const client = getClient(apiKey)
  const { data } = await client.get(`/contents/generations/tasks/${taskId}`)
  return data
}

// 批量查询任务列表
export async function listTasks(apiKey, params = {}) {
  const client = getClient(apiKey)
  const query = {}
  if (params.page_num) query.page_num = params.page_num
  if (params.page_size) query.page_size = params.page_size
  if (params.status) query['filter.status'] = params.status
  const { data } = await client.get('/contents/generations/tasks', { params: query })
  return data
}

// 取消/删除任务
export async function deleteTask(apiKey, taskId) {
  const client = getClient(apiKey)
  const { data } = await client.delete(`/contents/generations/tasks/${taskId}`)
  return data
}

// 上传文件
export async function uploadFile(apiKey, file) {
  const formData = new FormData()
  formData.append('purpose', 'user_data')
  formData.append('file', file)
  const client = axios.create({
    baseURL: BASE_URL,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'multipart/form-data'
    },
    timeout: 120000
  })
  const { data } = await client.post('/files', formData)
  return data
}
