import assert from 'node:assert'
import { promises as fs } from 'node:fs'

export type Context = {
  repo: {
    owner: string
    repo: string
  }
  apiUrl: string
  sha: string
  serverUrl: string
  runnerTemp: string
  readEvent: () => Promise<string>
}

export const getContext = (): Context => {
  // https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/store-information-in-variables#default-environment-variables
  return {
    repo: getRepo(),
    apiUrl: getEnv('GITHUB_API_URL'),
    sha: getEnv('GITHUB_SHA'),
    serverUrl: getEnv('GITHUB_SERVER_URL'),
    runnerTemp: getEnv('RUNNER_TEMP'),
    readEvent: async () => await fs.readFile(getEnv('GITHUB_EVENT_PATH'), 'utf8'),
  }
}

const getRepo = () => {
  const [owner, repo] = getEnv('GITHUB_REPOSITORY').split('/')
  return { owner, repo }
}

const getEnv = (name: string): string => {
  assert(process.env[name], `${name} is required`)
  return process.env[name]
}
