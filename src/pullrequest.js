import * as github from '@actions/github'

import inputs from './inputs.js'

class PullRequest {
  constructor() {
    this.octokit = github.getOctokit(inputs.token)
    this.pullRequestRaw = this.getPullRequest(inputs.number)
    this.number = pullRequestRaw.number
    this.repo = pullRequestRaw.repo
    repo.set('org', repo.owner.login)
    this.branchName = this.pullRequestRaw.head.ref
    this.title = pullRequestRaw.title
    this.requestedReviewers = this.pullRequestRaw.requested_reviewers
    this.requestedTeams = this.pullRequestRaw.requested_teams
    this.reviews = this.getReviews()
  }

  async getPullRequest() {
    core.info('Getting pull request')
    try {
      core.debug('Fetching pull request')
      const eventPayload = github.context.payload
      return ({ data: pullRequest } = await this.octokit.rest.pulls.get({
        owner: eventPayload.repository.repo.owner.login,
        repo: eventPayload.repository.name,
        pull_number: eventPayload.pull_request.number
      }))
    } catch (error) {
      throw new Error(
        `The pull request could not be retrieved. Details: ${error.message}`
      )
    }
  }

  async setPrReviewers(reviewers) {
    try {
      const userReviewers = reviewers.filter(reviewer =>
        reviewer.startsWith('user')
      )
      const teamReviewers = reviewers.filter(reviewer =>
        reviewer.startsWith('team')
      )

      core.info(`Setting reviewers for pull request #${this.number}`)
      this.octokit.rest.pulls.requestReviewers({
        owner: this.repo.owner,
        repo: this.repo.name,
        pull_number: this.number
      })
    } catch (error) {
      throw new Error(
        `The reviewers for pull request #${this.number} could not be set. Details: ${error.message}`
      )
    }
  }

  async getReviews() {
    core.info(`Getting reviewers for pull request #${this.number}`)
    this.octokit.rest.pulls.listReviews({
      owner: this.repo.owner,
      repo: this.repo.name,
      pull_number: this.number
    })
  }
}

export const pullRequest = new PullRequest()
