import * as core from '@actions/core'
import * as github from '@actions/github'

import { inputs } from './inputs.js'

const octokit = github.getOctokit(inputs.token)

/**
 * Represents a pull request and provides methods for managing its reviewers.
 *
 * @class
 * @param {Object} data - The raw data of the pull request containing details like number, title, and requested reviewers.
 * @param {Array} reviews - An array of review objects, each with details about the reviewer (either 'user:username' or 'team:teamname').
 *
 * @property {Number} number - The unique identifier for the pull request.
 * @property {Object} repo - Contains information about the repository, including its owner and name.
 * @property {String} repo.org - The organization owner's login associated with the repository.
 * @property {String} branchName - The name of the branch the pull request is targeting.
 * @property {String} title - The title of the pull request.
 * @property {Array} requestedReviewers - An array of users or teams that have been requested to review the pull request.
 * @property {Array} requestedTeams - An array of teams that have been requested to review the pull request.
 * @property {Array} reviews - An array of all reviews associated with this pull request.

 * @method setPrReviewers(reviewers) - Sets the reviewers for the pull request by filtering and sending a request to update them.
 *
 * @example
 * const pr = new PullRequest(data, reviews);
 * pr.setPrReviewers(['user:john', 'team:frontend']);
 */
class PullRequest {
  /**
   * A class representing a pull request with methods to manage its reviews.
   */
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

  /**
   * Sets reviewers for a pull request.
   *
   * @param {Array} reviewers - Array of reviewer strings ('user:login' or 'team:team_name').
   * @returns {void}
   * @throws {Error} If there is an error setting the reviewers.
   */
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
  /**
   * Retrieves information about a specific pull request.
   *
   * @param {Object} eventPayload - The context payload containing pull request details
   * @returns {Promise<Object>} A promise resolving to a PullRequest object with details like number, repo, title, and more.
   * @throws {Error} If the pull request cannot be retrieved, including any original errors
   */
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
  /**
   * Fetches the reviews for a specified pull request.
   *
   * @param {Object} pullRequest - The PullRequest instance containing the pull request data
   * @returns {Promise<Object[]>} A promise resolving to an array of review objects with details like user, team, and comment.
   * @throws {Error} If there's an error fetching the reviews
   */
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
