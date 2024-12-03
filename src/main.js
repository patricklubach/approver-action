import core from '@actions/core'
import github from '@actions/github'

import * as utils from './utils.js'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */

async function run() {
  try {
    const repo = process.env.GITHUB_ACTION_REPOSITORY
    const repo_name = repo.split('/')[1]
    const owner = process.env.GITHUB_REPOSITORY_OWNER
    const pr_number = core.getInput('pr_number', { required: true })
    const token = core.getInput('gh_token', { required: true })
    const octokit = github.getOctokit(token)

    octokit.log.info(`repo: ${repo}`)
    octokit.log.info(`repo_name: ${repo_name}`)
    octokit.log.info(`owner: ${owner}`)
    octokit.log.info(`pr_number: ${pr_number}`)

    // Get a list of all reviews of the PR
    const reviews = utils.getReviews(octokit, owner, repo_name, pr_number)
    if(reviews == 0) {
      core.info('There are no reviews to check')
      return
    }

    // Filter reviews by status == 'APPROVED'
    const approvedReviews = utils.getApprovals(reviews)

    // Create a list of all persons who already reviewed and approved the PR
    const reviewers = utils.getReviewers(approvedReviews)

    // Get the title of the PR
    const title = utils.getPRTitle(octokit, owner, repo_name, pr_number)

    // Get the data from config file
    const filePath = core.getInput('approvers_file', { required: false })
    const data = utils.getYamlData(filePath)

    // Get the rule who matches the PR title
    const rule = utils.getMatchingRule(title, data)

    // Get the list of all desired approvers
    const approvers = utils.computeApprovers(octokit, owner, rule['approvers'])

    // Check if all desired approvers approved PR
    const approversLeft = utils.getApproversLeft(reviewers, approvers)

    // If there are approvers left fail action, if not pass check
    if(!approversLeft.length > 0) {
      core.error('Following approvers are missing:')
      for(let i = 0; i < approversLeft.length; i++) {
        core.info(approversLeft[i])
      }
      throw new Error('Set rule is not fulfilled!')
    }
  } catch(error) {
    // Fail the workflow run if an error occurs
    core.setFailed(error)
    return
  }
}

export { run }
