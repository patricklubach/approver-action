import * as core from '@actions/core'

import * as check from './check.js'
import * as utils from './utils.js'

async function run() {
  try {
    // Get the rule who matches the PR title.
    // When no matching rule is found then it tries to fallback to the default rule. If none is defined it throws an error.
    const desiredReviewers = check.config.getMatchingRule(pullRequest).entities

    // if set_reviewers action property is set to true on the action,
    // check if requested reviewers are already set on pr.
    // if not these are set according to the reviewers rule.
    // Note: All previously set reviewers on the pr are overwritten and reviews are resetted!
    if (check.inputs.setReviewers) {
      core.debug('set_reviewers property is set')
      const response = await utils.setPrReviewers(
        check.githubClients,
        check.owner,
        check.repoName,
        check.pullRequest,
        desiredReviewers
      )
      if (response.status) {
        core.info(`Updated reviewers for PR #${prNumber}`)
      } else {
        throw new Error(
          `Could not update PR succesfully. Status code: ${response.status}`
        )
      }
      return
    }

    // Filter list of reviews by status == 'APPROVED'
    const approvedReviews = check.getApprovals()

    // Create list of users from approved reviews
    const approvers = check.getApprovers(approvedReviews)

    // Check if all desired reviewers approved PR
    const type = rule.hasOwnProperty('type') ? rule.type : 'ONE_OF_EACH'
    const amount =
      rule.type == '' && rule.hasOwnProperty('amount') ? rule.amount : 0
    utils.getReviewersLeft(octokit, owner, reviewers, approvers, type, amount)
    core.info(`Rule is fulfilled`)
  } catch (error) {
    // Fail the workflow run if an error occurs
    core.setFailed(`Reviewers Action failed! Details: ${error.message}`)
  }
}

export { run }
