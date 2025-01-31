import * as github from '@actions/github'

import { Config } from './config.js'
import { Inputs } from './inputs.js'

class Check {
  constructor() {
    this.inputs = new Inputs()
    this.config = new Config(this.inputs.configPath)
    this.context = github.context
    this.owner = this.context.repo.owner
    this.repoName = this.context.repo.repo
    this.pullRequest = getPullRequest()
    this.event =
      this.context.payload.pull_request ||
      this.context.payload.pull_request_review
    this.githubClient = github.getOctokit(myToken)
  }

  async getPullRequest() {
    core.info('Getting pull request')

    try {
      core.debug(`Fetching pull request from endpoint: ${url}`)
      return ({ data: pullRequest } = await octokit.rest.pulls.get({
        owner: this.owner,
        repo: this.repoName,
        pull_number: this.event.pull_request.number
      }))
    } catch (error) {
      throw new Error(
        `The pull request could not be retrieved. Details: ${error.message}`
      )
    }
  }

  async getReviews() {
    core.info(`Getting reviews of pull request #${this.pullRequest.number}`)

    try {
      return ({ data: reviews } = await octokit.rest.pulls.get({
        owner: this.owner,
        repo: this.repoName,
        pull_number: this.pullRequest.number
      }))
    } catch (error) {
      throw new Error(
        `Reviews could not be retrieved from GitHub. Details: ${error.message}`
      )
    }
  }

  getApprovedReviews() {
    core.info('Getting list of approvals')
    try {
      const reviews = this.getReviews()
      return reviews.filter(review => review.state === 'APPROVED')
    } catch (error) {
      throw new Error(
        `Cannot filter reviews for approvals. Details: ${error.message}`
      )
    }
  }

  getApprovers(reviews) {
    core.info('Filter list of reviews for users which approved yet')
    try {
      let reviewers = []
      for (const review of reviews) {
        if (review.state == 'APPROVED') {
          reviewers.push(['user', review.user.login].join(':'))
        }
      }
      core.info(`Following users reviewed and approved yet: ${reviewers}`)
      return reviewers
    } catch (error) {
      throw new Error(`Cannot get reviewers. Details: ${error.message}`)
    }
  }
}

export const check = new Check()
