import type { KustomizeError } from './build.js'
import type { Context } from './github.js'

type CommentOptions = {
  header: string
  footer: string
  token: string
}

export const formatErrors = (errors: KustomizeError[], context: Context): string[] => {
  return errors.map((error) => errorTemplate(error, context))
}

export const commentErrors = async (
  prettyErrors: string[],
  options: CommentOptions,
  context: Context,
): Promise<void> => {
  const pullRequestNumber = await getPullRequestNumber(context)
  if (pullRequestNumber === undefined) {
    return
  }

  const body = [options.header, prettyErrors.join('\n'), options.footer].join('\n')
  const response = await fetch(
    `${context.apiUrl}/repos/${encodeURIComponent(context.repo.owner)}/${encodeURIComponent(
      context.repo.repo,
    )}/issues/${pullRequestNumber}/comments`,
    {
      method: 'POST',
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${options.token}`,
        'content-type': 'application/json',
        'x-github-api-version': '2022-11-28',
      },
      body: JSON.stringify({ body }),
    },
  )
  if (!response.ok) {
    throw new Error(`failed to create a comment: ${response.status} ${response.statusText}`)
  }
}

const errorTemplate = (e: KustomizeError, context: Context): string => {
  return `
### ${e.kustomization.kustomizationDir}
[kustomization.yaml](${kustomizationUrl(e.kustomization.kustomizationDir, context)}) error:
\`\`\`
${e.stderr.replaceAll('\n', '').replaceAll(':', ':\n')}
\`\`\`
`
}

const kustomizationUrl = (directory: string, context: Context) =>
  `${context.serverUrl}/${context.repo.owner}/${context.repo.repo}/blob/${context.sha}/${directory}/kustomization.yaml`

const getPullRequestNumber = async (context: Context): Promise<number | undefined> => {
  const event = JSON.parse(await context.readEvent()) as { pull_request?: { number?: number } }
  return event.pull_request?.number
}
