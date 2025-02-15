/*
  This file contains all the helper functions used in main file.
*/

import * as core from '@actions/core'
import { PullRequestReviewPayload } from './interfaces'
import { PullRequest } from './pullrequest'

/**
 * Validates if the event name is either 'pull_request' or 'pull_request_review'.
 * If not, throws an error indicating unsupported event type.
 *
 * @param {String} eventName - The name of the event to validate
 * @throws Error - If the event type is not supported
 */
function validateEvent(eventName: string) {
  core.debug(`Validating if event type '${eventName}' is supported`)
  if (!['pull_request', 'pull_request_review'].includes(eventName)) {
    throw new Error(
      `Unsupported event type! Supporing: ["pull_request", "pull_request_review"]. Got: ${eventName}`
    )
  }
  core.debug(`Event type '${eventName}' is supported`)
}

/**
 * Checks and filters reviewers into user and team categories,
 * then validates against pull request's requested reviewers.
 *
 * @param {Array} reviewers - Array of reviewer strings (e.g., 'user:alice', 'team:engineering')
 * @param {Object} pullRequest - Pull request object containing repository details
 * @returns {Boolean} true if all required reviewers are correctly set, false otherwise
 */
function setReviewers(reviewers: Array<string>, pullRequest: PullRequest) {
  core.info('Checking if reviewers are already set')
  const userReviewers = reviewers.filter(reviewer => {
    if (reviewer.startsWith('user')) {
      return reviewer.split(':')[0]
    }
  })
  const teamReviewers = reviewers.filter(reviewer => {
    if (reviewer.startsWith('team')) {
      return reviewer.split(':')[0]
    }
  })

  const pullRequestRequestedReviewerUsers = pullRequest.requested_reviewers
  const pullRequestRequestedReviewerTeams = pullRequest.requested_teams

  // Check if desired reviewer user are already assigned to the pr
  pullRequestRequestedReviewerUsers.forEach(reviewer => {
    let reviewerName = reviewer.login
    core.debug(`Check if user ${reviewerName} is already set`)
    if (!userReviewers.includes(reviewerName)) {
      core.warning(
        `Reviewer user ${reviewerName} is not in requested reviewers of PR #${pullRequest.number}`
      )
      return false
    }
  })

  // Check if desired reviewer teams are already assigned to the pr
  pullRequestRequestedReviewerTeams.forEach(reviewer => {
    let reviewerName = reviewer.login
    core.debug(`Check if team ${reviewerName} is already set`)
    if (!teamReviewers.includes(reviewerName)) {
      core.warning(
        `Reviewer team ${reviewerName} is not in requested reviewers of PR #${pullRequest.number}`
      )
      return false
    }
  })

  return true
}

/**
 * Updates the requested reviewers for a pull request using GitHub API.
 *
 * @param {Object} pullRequest - Pull request object containing repository details
 * @param {Array} reviewers - Array of reviewer strings (e.g., 'user:alice', 'team:engineering')
 * @returns {Promise} Promise with client.rest.pulls.post response
 */
function setPrReviewers(pullRequest, reviewers) {
  try {
    const userReviewers = reviewers.filter(reviewer =>
      reviewer.startsWith('user')
    )
    const teamReviewers = reviewers.filter(reviewer =>
      reviewer.startsWith('team')
    )

    core.info(`Setting reviewers for pull request #${pullRequest.number}`)
    return client.request(
      `POST /repos/${owner}/${repo}/pulls/${pullRequest.number}/requested_reviewers`,
      {
        owner: pullRequest.repository.owner,
        repo: pullRequest.repository.repo,
        pull_number: pullRequest.number,
        reviewers: userReviewers,
        team_reviewers: teamReviewers,
        headers: {
          'X-GitHub-Api-Version': '2022-11-28'
        }
      }
    )
  } catch (error) {
    throw new Error(
      `The reviewers for pull request #${pullRequest.number} could not be set. Details: ${error.message}`
    )
  }
}

/**
 * Fetches a specific pull request by its number using GitHub API.
 *
 * @param {Object} client - Instance of the GitHub API client
 * @param {String} owner - Owner repository name
 * @param {String} repoName - Repository name
 * @param {Number} number - Pull request number to fetch
 * @returns {Promise} Promise with pull request data structure
 */
async function getPullRequest(client, owner, repoName, number): Promise<PullRequestReviewPayload> {
  core.info(`Getting pull request #${number}`)
  try {
    core.debug(`Fetching pull request #${number}`)
    return ({ data: pullRequest } = await client.rest.pulls.get({
      owner: owner,
      repo: repoName,
      pull_number: number
    }))
  } catch (error: any) {
    throw new Error(
      `The pull request could not be retrieved. Details: ${error.message}`
    )
  }
}

/**
 * Determines the condition value based on the given type.
 *
 * @param {String} conditionType - Type of condition ('branch_name' or 'title')
 * @param {Object} pullRequest - Pull request object containing necessary data
 * @returns {String} Corresponding condition value
 * @throws Error - If invalid condition type is provided
 */
function getCondition(conditionType, pullRequest) {
  core.debug(
    `Determine condition value based on condition type '${conditionType}'`
  )
  if (conditionType === 'branch_name') {
    return pullRequest.branchName
  }
  if (conditionType === 'title') {
    return pullRequest.title
  }
  throw new Error(`Invalid condition type: ${conditionType}`)
}

/**
 * Filters reviews to include only those marked as APPROVED.
 *
 * @param {Array} reviews - Array of review objects
 * @returns {Array} Filtered list of approved reviews
 * @throws Error - If filtering fails
 */
function getApprovedReviews(reviews) {
  core.info('Filtering reviews by status = approved')
  try {
    return reviews.filter(review => review.state === 'APPROVED')
  } catch (error) {
    throw new Error(
      `Cannot filter reviews for status 'APPROVED'. Details: ${error.message}`
    )
  }
}

export {
  getApprovedReviews,
  getCondition,
  getPullRequest,
  setPrReviewers,
  setReviewers,
  validateEvent
}

