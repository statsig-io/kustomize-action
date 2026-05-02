import * as core from '@actions/core'
import * as github from '@actions/github'
import * as path from 'path'
import { KustomizeError } from './build'

type CommentOptions = {
  header: string
  footer: string
  token: string
}

type CreateCommentResponse = {
  html_url?: string
}

export const commentErrors = async (errors: KustomizeError[], o: CommentOptions): Promise<void> => {
  if (github.context.payload.pull_request === undefined) {
    return
  }

  const body = [o.header, errors.map(errorTemplate).join('\n'), o.footer].join('\n')
  const { owner, repo } = github.context.repo
  const url = new URL(
    `repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${github.context.payload.pull_request.number}/comments`,
    `${github.context.apiUrl}/`,
  )
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${o.token}`,
      'content-type': 'application/json',
      'x-github-api-version': '2022-11-28',
    },
    body: JSON.stringify({ body }),
  })
  if (!response.ok) {
    throw new Error(`failed to create a comment: ${response.status} ${response.statusText}`)
  }
  const data = (await response.json()) as CreateCommentResponse
  core.info(`created a comment as ${data.html_url ?? '(unknown URL)'}`)
}

export const summaryErrors = async (errors: KustomizeError[]) => {
  core.summary.addRaw(`kustomize build finished with ${errors.length} error(s)`)
  core.summary.addRaw(errors.map(errorTemplate).join('\n'))
  await core.summary.write()
}

const errorTemplate = (e: KustomizeError): string => {
  const relativeDir = path.relative('.', e.kustomization.kustomizationDir)
  return `
### ${relativeDir}
[kustomization.yaml](${kustomizationUrl(relativeDir)}) is invalid:
<blockquote>${e.stderr.trim()}</blockquote>
`
}

const kustomizationUrl = (directory: string) => {
  const { serverUrl, repo, sha } = github.context
  return `${serverUrl}/${repo.owner}/${repo.repo}/blob/${sha}/${directory}/kustomization.yaml`
}
