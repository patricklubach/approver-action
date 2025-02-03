import * as core from '@actions/core'
import * as github from '@actions/github'

import { inputs } from './inputs.js'

const octokit = github.getOctokit(inputs.token)

class PullRequest {
  constructor(data, reviews) {
    this.pullRequestRaw = data
    this.number = this.pullRequestRaw.number
    this.repo = this.pullRequestRaw.head.repo
    this.repo.org = this.repo.owner.login
    this.branchName = this.pullRequestRaw.head.ref
    this.title = this.pullRequestRaw.title
    this.requestedReviewers = this.pullRequestRaw.requested_reviewers
    this.requestedTeams = this.pullRequestRaw.requested_teams
    this.reviews = reviews
  }

  setPrReviewers(reviewers) {
    try {
      const userReviewers = reviewers.filter(reviewer =>
        reviewer.startsWith('user')
      )
      const teamReviewers = reviewers.filter(reviewer =>
        reviewer.startsWith('team')
      )

      core.info(`Setting reviewers for pull request #${this.number}`)
      octokit.rest.pulls.requestReviewers({
        owner: this.repo.owner,
        repo: this.repo.name,
        pull_number: this.number,
        reviewers: userReviewers,
        team_reviewers: teamReviewers
      })
    } catch (error) {
      throw new Error(
        `The reviewers for pull request #${this.number} could not be set. Details: ${error.message}`
      )
    }
  }
}

async function getPullRequest() {
  core.info(`Getting pull request #${inputs.prNumber}`)
  try {
    const eventPayload = github.context.payload
    const owner = eventPayload.pull_request.head.repo.owner.login
    const reponame = eventPayload.pull_request.head.repo.name
    const number = eventPayload.pull_request.number

    return await octokit.rest.pulls.get({
      owner: owner,
      repo: reponame,
      pull_number: number
    })
  } catch (error) {
    throw new Error(`The pull request could not be retrieved`, {
      cause: error
    })
  }
}

async function getReviews(pullRequest) {
  core.info(`Getting reviewers for pull request #${pullRequest.number}`)
  return await octokit.rest.pulls.listReviews({
    owner: pullRequest.head.repo.owner.login,
    repo: pullRequest.head.repo.name,
    pull_number: pullRequest.number
  })
}

const { data: pullRequestData } = await getPullRequest()
const { data: pullRequestReviews } = await getReviews(pullRequestData)

export const pullRequest = new PullRequest(pullRequestData, pullRequestReviews)
