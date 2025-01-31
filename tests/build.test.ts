import * as exec from '@actions/exec'
import * as io from '@actions/io'

import { Kustomization, kustomizeBuild } from '../src/build'

import { LoadRestrictor } from '../src/run'
import { RetryOptions } from '../src/kustomize'

jest.mock('@actions/core') // suppress logs

jest.mock('@actions/exec')
jest.mock('@actions/io')
const execMock = exec.getExecOutput as jest.Mock<Promise<exec.ExecOutput>, [string, string[]]>
const mkdirPMock = io.mkdirP as jest.Mock<Promise<void>, [string]>

const noRetry: RetryOptions = {
  retryMaxAttempts: 0,
  retryWaitMs: 0,
}

test('nothing', async () => {
  const errors = await kustomizeBuild([], {
    maxProcess: 1,
    writeIndividualFiles: false,
    showErrorAnnotation: true,
    loadRestrictor: LoadRestrictor.LoadRestrictionsRootOnly,
    ...noRetry,
  })
  expect(errors).toStrictEqual([])
  expect(mkdirPMock).not.toHaveBeenCalled()
  expect(execMock).not.toHaveBeenCalled()
})

test('build a directory', async () => {
  execMock.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' })
  const errors = await kustomizeBuild(
    [
      {
        kustomizationDir: '/fixtures/development',
        outputDir: '/output/development',
      },
    ],
    {
      maxProcess: 3,
      writeIndividualFiles: false,
      showErrorAnnotation: true,
      loadRestrictor: LoadRestrictor.LoadRestrictionsRootOnly,
      ...noRetry,
    }
  )
  expect(errors).toStrictEqual([])
  expect(mkdirPMock).toHaveBeenCalledWith('/output/development')
  expect(execMock).toHaveBeenCalledTimes(1)
  expect(execMock.mock.calls[0][0]).toBe('kustomize')
  expect(execMock.mock.calls[0][1]).toStrictEqual([
    'build',
    '/fixtures/development',
    '-o',
    '/output/development/generated.yaml',
    '--load-restrictor',
    'LoadRestrictionsRootOnly',
  ])
})

test('build a directory to individual files', async () => {
  execMock.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' })
  const errors = await kustomizeBuild(
    [
      {
        kustomizationDir: '/fixtures/development',
        outputDir: '/output/development',
      },
    ],
    {
      maxProcess: 3,
      writeIndividualFiles: true,
      showErrorAnnotation: true,
      loadRestrictor: LoadRestrictor.LoadRestrictionsRootOnly,
      ...noRetry,
    }
  )
  expect(errors).toStrictEqual([])
  expect(mkdirPMock).toHaveBeenCalledWith('/output/development')
  expect(execMock).toHaveBeenCalledTimes(1)
  expect(execMock.mock.calls[0][0]).toBe('kustomize')
  expect(execMock.mock.calls[0][1]).toStrictEqual([
    'build',
    '/fixtures/development',
    '-o',
    '/output/development',
    '--load-restrictor',
    'LoadRestrictionsRootOnly',
  ])
})

test('build a directory with an error', async () => {
  execMock.mockResolvedValue({ exitCode: 1, stdout: '', stderr: 'error' })
  const errors = await kustomizeBuild(
    [
      {
        kustomizationDir: '/fixtures/development',
        outputDir: '/output/development',
      },
    ],
    {
      maxProcess: 3,
      writeIndividualFiles: false,
      showErrorAnnotation: true,
      loadRestrictor: LoadRestrictor.LoadRestrictionsRootOnly,
      ...noRetry,
    }
  )
  expect(errors.length).toBe(1)
  expect(mkdirPMock).toHaveBeenCalledWith('/output/development')
  expect(execMock).toHaveBeenCalledTimes(1)
})

test.each`
  overlays | maxProcess
  ${1}     | ${1}
  ${1}     | ${2}
  ${2}     | ${1}
  ${2}     | ${2}
  ${2}     | ${3}
  ${3}     | ${1}
  ${3}     | ${2}
  ${3}     | ${3}
  ${3}     | ${4}
`(
  'build $overlays directories using $maxProcess process',
  async ({ overlays, maxProcess }: { overlays: number; maxProcess: number }) => {
    execMock.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' })

    const kustomizations: Kustomization[] = []
    for (let i = 0; i < overlays; i++) {
      kustomizations.push({
        kustomizationDir: `/input/fixture${i}`,
        outputDir: `/output/fixture${i}`,
      })
    }
    const errors = await kustomizeBuild(kustomizations, {
      maxProcess,
      writeIndividualFiles: false,
      showErrorAnnotation: true,
      loadRestrictor: LoadRestrictor.LoadRestrictionsRootOnly,
      ...noRetry,
    })

    expect(errors).toStrictEqual([])
    expect(execMock).toHaveBeenCalledTimes(overlays)
    for (let i = 0; i < overlays; i++) {
      expect(mkdirPMock).toHaveBeenCalledWith(`/output/fixture${i}`)
      expect(execMock.mock.calls[i][0]).toBe('kustomize')
      expect(execMock.mock.calls[i][1]).toStrictEqual([
        'build',
        `/input/fixture${i}`,
        '-o',
        `/output/fixture${i}/generated.yaml`,
        '--load-restrictor',
        'LoadRestrictionsRootOnly',
      ])
    }
  }
)

test.each`
  overlays | maxProcess | exitCodes
  ${3}     | ${2}       | ${[1, 0, 0]}
  ${3}     | ${2}       | ${[0, 1, 0]}
  ${3}     | ${2}       | ${[0, 0, 1]}
  ${4}     | ${2}       | ${[1, 0, 0, 0]}
  ${4}     | ${2}       | ${[0, 1, 0, 0]}
  ${4}     | ${2}       | ${[0, 0, 1, 0]}
  ${4}     | ${2}       | ${[0, 0, 0, 1]}
`(
  'build $overlays directories using $maxProcess process with error $exitCodes',
  async ({ overlays, maxProcess, exitCodes }: { overlays: number; maxProcess: number; exitCodes: number[] }) => {
    for (const exitCode of exitCodes) {
      execMock.mockResolvedValueOnce({ exitCode, stdout: '', stderr: '' })
    }

    const kustomizations: Kustomization[] = []
    for (let i = 0; i < overlays; i++) {
      kustomizations.push({
        kustomizationDir: `/input/fixture${i}`,
        outputDir: `/output/fixture${i}`,
      })
    }
    const errors = await kustomizeBuild(kustomizations, {
      maxProcess,
      writeIndividualFiles: false,
      showErrorAnnotation: true,
      loadRestrictor: LoadRestrictor.LoadRestrictionsRootOnly,
      ...noRetry,
    })

    expect(errors.length).toBe(1)
    expect(execMock).toHaveBeenCalledTimes(overlays)
    for (let i = 0; i < overlays; i++) {
      expect(mkdirPMock).toHaveBeenCalledWith(`/output/fixture${i}`)
      expect(execMock.mock.calls[i][0]).toBe('kustomize')
      expect(execMock.mock.calls[i][1]).toStrictEqual([
        'build',
        `/input/fixture${i}`,
        '-o',
        `/output/fixture${i}/generated.yaml`,
        '--load-restrictor',
        'LoadRestrictionsRootOnly',
      ])
    }
  }
)

test('build correctly passes the load restrictor argument', async () => {
  execMock.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' })
  const errors = await kustomizeBuild(
    [
      {
        kustomizationDir: '/fixtures/development',
        outputDir: '/output/development',
      },
    ],
    {
      maxProcess: 3,
      writeIndividualFiles: false,
      showErrorAnnotation: true,
      loadRestrictor: LoadRestrictor.LoadRestrictionsNone,
      ...noRetry,
    }
  )
  expect(errors).toStrictEqual([])
  expect(mkdirPMock).toHaveBeenCalledWith('/output/development')
  expect(execMock).toHaveBeenCalledTimes(1)
  expect(execMock.mock.calls[0][0]).toBe('kustomize')
  expect(execMock.mock.calls[0][1]).toStrictEqual([
    'build',
    '/fixtures/development',
    '-o',
    '/output/development/generated.yaml',
    '--load-restrictor',
    'LoadRestrictionsNone',
  ])
})
