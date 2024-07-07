import core from '@actions/core'
import github from '@actions/github'

import * as utils from './utils.js'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */

async function run() {
  try {
    const org = core.getInput('org', { required: false })
    const owner = core.getInput('owner', { required: true })
    const repo = core.getInput('repo', { required: true })
    const pr_number = core.getInput('pr_number', { required: true })
    const token = core.getInput('gh_token', { required: true })
    const octokit = github.getOctokit(token)

    // Get a list of all reviews of the PR
    const reviews = utils.getReviews(octokit, owner, repo, pr_number)
    if (isEmpty(reviews)) {
        core.info("There are no reviews to check")
        exit()
    } 

    // Filter reviews by status == 'APPROVED'
    const approvedReviews = utils.getApprovals(reviews)

    // Create a list of all persons who already reviewed and approved the PR
    const reviewers = utils.getReviewers(approvedReviews)

    // Get the title of the PR
    const title = utils.getPRTitle(octokit, owner, repo, pr_number)

    // Get the data from config file
    const filePath = core.getInput('approvers_file', { required: false })
    const data = utils.getYamlData(filePath)

    // Get the rule who matches the PR title
    const rule = utils.getMatchingRule(title, data)

    // Get the list of all desired approvers
    const approvers = utils.computeApprovers(octokit, org, rule['approvers'])

    // Check if all desired approvers approved PR
    const approversLeft = utils.getApproversLeft(reviewers, approvers)

    // If there are approvers left fail action, if not pass check
    if (!approversLeft.length > 0) {
      core.error('Following approvers are missing:')
      for (let i = 0; i < approversLeft.length; i++) {
        core.info(approversLeft[i])
      }
      throw new Error('Set rule is not fulfilled!')
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    core.setFailed(error)
  }
}

export { run }
