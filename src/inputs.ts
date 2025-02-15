import * as core from '@actions/core'

/**
 * Manages input configuration for the review system.
 *
 * @class Inputs
 */
export class Inputs {
  configPath: string
  prNumber: string
  setReviewers: string
  token: string

  /**
   * Constructs an instance of `Inputs` to manage configuration parameters.
   * Reads inputs from command line arguments or defaults if not provided.
   */
  constructor() {
    this.configPath = core.getInput('reviewers_file', { required: false })
    this.prNumber = core.getInput('pr_number', { required: true })
    this.setReviewers =
      core.getInput('set_reviewers', { required: false }) || "false"
    this.token = core.getInput('token', { required: true })

    this.#printDebug()
  }

  /**
   * Prints debug information about the current input configuration.
   *
   * @private
   */
  #printDebug() {
    core.debug('Inputs:')
    core.debug(`reviewers_file: ${this.configPath}`)
    core.debug(`pr_number: ${this.prNumber}`)
    core.debug(`set_reviewers: ${this.setReviewers}`)
  }
}

export const inputs = new Inputs()
