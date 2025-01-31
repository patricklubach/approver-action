import * as core from '@actions/core'

export class Inputs {
  constructor() {
    this.configPath = core.getInput('reviewers_file', { required: false })
    this.prNumber = core.getInput('pr_number', { required: true })
    this.setReviewers =
      core.getInput('set_reviewers', { required: false }) || false
    this.token = core.getInput('token', { required: true })

    this.printDebug()
  }

  printDebug() {
    // Inputs debugs outputs
    core.debug('Inputs:')
    core.debug(`repo: ${this.repo}`)
    core.debug(`owner: ${this.owner}`)
    core.debug(`repo_name: ${this.repoName}`)
    core.debug(`pr_number: ${this.prNumber}`)
  }
}
