import * as core from '@actions/core'
import * as github from '@actions/github'

import * as check from './check.js'
import Config from './config.js'
import { Reviewers } from './entities.js'
import inputs from './inputs.js'
import { pullRequest } from './pullrequest.js'
import * as utils from './utils.js'

async function run() {
  try {
    utils.validateEvent(github.context.eventName)

    const config = new Config(inputs.configPath)
    const rules = config.rules
    const condition = utils.getCondition(config.conditionType, pullRequest)
    const matchingRule = rules.getMatchingRule(condition)
    const reviewers = new Reviewers(matchingRule.reviewers)

    // if set_reviewers action property is set to true on the action,
    // check if requested reviewers are already set on pr.
    // if not these are set according to the reviewers rule.
    // Note: All previously set reviewers on the pr are overwritten and reviews are resetted!
    if (inputs.setReviewers) {
      core.debug('set_reviewers property is set')
      if (!utils.reviewersSet()) pullRequest.setPrReviewers(reviewers.reviewers)
      return
    }

    // Filter list of reviews by status 'APPROVED'
    const approvedReviews = check.getApprovals(pullRequest.reviews)

    // Check whether all conditions are met
    if (!check.isFulfilled(matchingRule, approvedReviews, reviewers.entities)) {
      throw new Error('Rule is not fulfilled!')
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    core.setFailed(`Reviewers Action failed! Details: ${error.message}`)
  }
}

export { run }
