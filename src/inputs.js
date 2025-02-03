import * as core from '@actions/core'

class Inputs {
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
    core.debug(`reviewers_file: ${this.configPath}`)
    core.debug(`pr_number: ${this.prNumber}`)
    core.debug(`set_reviewers: ${this.setReviewers}`)
  }
}

export const inputs = new Inputs()
