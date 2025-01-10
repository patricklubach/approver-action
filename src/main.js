import * as core from '@actions/core'
import { Octokit } from '@octokit/core'

import * as utils from './utils.js'

async function run() {
  try {
    const prNumber = core.getInput('pr_number', { required: true })
    const token = core.getInput('token', { required: true })
    const setReviewers = core.getInput('set_reviewers', { required: false }) || false
    const octokit = new Octokit({ auth: token })
    const repo = process.env.GITHUB_REPOSITORY
    const [owner, repoName] = repo.split('/')

    // Get the data from config file
    const filePath = core.getInput('reviewers_file', { required: false })
    const reviewersFile = utils.getYamlData(filePath)

    // Inputs debugs outputs
    core.debug('Inputs:')
    core.debug(`repo: ${repo}`)
    core.debug(`owner: ${owner}`)
    core.debug(`repo_name: ${repoName}`)
    core.debug(`pr_number: ${prNumber}`)

    // Get the pull request
    const { data: pullRequest } = await utils.getPullRequest(
      octokit,
      owner,
      repoName,
      prNumber
    )

    // Determines on what to check. Either title or branch name
    checkOn = reviewersFile.hasOwnProperty('check_on') ? reviewersFile.check_on : 'branch_name'

    switch(checkOn) {
      case 'title':
        checkOn = pullRequest.title
        core.debug(`Action will check on title: "${checkOn}"`)
        break;
      case 'branch_name':
        checkOn = pullRequest.head.ref
        core.debug(`Action will check on branch: "${checkOn}"`)
        break;
      default:
        throw new Error(`check_on property is misconfigured. Allowed values are: [title, branch_name]. Got: ${reviewersFile.check_on}`)
    }

    // Get the rule who matches the PR title.
    // When no matching rule is found then it tries to fallback to the default rule. If none is defined it throws an error.
    const rule = utils.getMatchingRule(checkOn, reviewersFile.rules)
    const reviewers = rule.reviewers

    // check if requested reviewers are already set on pr
    // this can be configured using the input
    if(setReviewers) {
      core.info('set_reviewers is set')
      const response = utils.setPrReviewers(octokit, owner, repo, pullRequest, reviewers)
      core.info(`Updated reviewers for PR #${prNumber}`)
      // TODO: Check for response code and if code == 200 return success if not throw error
      return
    }

    // Get a list of all reviews of the PR
    const { data: reviews } = await utils.getReviews(
      octokit,
      owner,
      repoName,
      prNumber
    )

    if(reviewers.length > reviews.length) {
      throw new Error(`There are still reviews required.`)
    } else {
      core.info(`There are ${reviews.length} reviews to check`)
    }

    // Filter reviews by status == 'APPROVED'
    const approvedReviews = utils.getApprovals(reviews)

    // Create list of users from approved reviews
    const approvers = utils.getApprovers(approvedReviews)

    // Check if all desired reviewers approved PR
    const type = rule.hasOwnProperty('type') ? rule.type : 'ONE_OF_EACH'
    const amount = rule.hasOwnProperty('amount') ? rule.amount : 0
    utils.getReviewersLeft(octokit, owner, reviewers, approvers, type, amount)
    core.info(`Rule is fulfilled`)
  } catch(error) {
    // Fail the workflow run if an error occurs
    core.setFailed(`Reviewers Action failed! Details: ${error.message}`)
  }
}

export { run }
