import * as core from '@actions/core'
import * as github from '@actions/github'

import { check } from './check.js'
import { Config } from './config.js'
import { inputs } from './inputs.js'
import { WebhookPayload } from './interfaces.js'
import * as pr from './pullrequest.js'
import { Rules } from './rules.js'
import * as utils from './utils.js'
import { version } from './version.js'

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    core.info(`Starting reviewer action (version: ${version})`)
    utils.validateEvent(github.context.eventName)

    const eventPayload: WebhookPayload = github.context.payload
    const owner: string =
      eventPayload?.pull_request?.head.repo.owner.login ?? ''
    const reponame: string = eventPayload?.pull_request?.head.repo.name ?? ''
    const prNumber: number = eventPayload?.pull_request?.number ?? 0

    // Validate event payload
    if (!owner) {
      throw new Error('Could not find owner of repository in event payload!')
    }
    if (!reponame) {
      throw new Error(
        'Could not find repo name of repository in event payload!'
      )
    }
    if (prNumber === 0) {
      throw new Error(
        'Could not find number of pull requeest in event payload!'
      )
    }

    const { data: pullRequestData } = await pr.getPullRequest(
      owner,
      reponame,
      prNumber
    )
    const { data: pullRequestReviews } = await pr.getReviews(
      owner,
      reponame,
      prNumber
    )
    const pullRequest = new pr.PullRequest(pullRequestData, pullRequestReviews)

    const config = new Config(inputs.configPath)
    const rules = new Rules(config.rules)
    const condition = utils.getCondition(config.conditionType, pullRequest)
    const matchingRule = rules.getMatchingRule(condition)
    const reviewers = matchingRule.reviewers

    // if set_reviewers action property is set to true on the action,
    // check if requested reviewers are already set on pr.
    // if not these are set according to the reviewers rule.
    // Note: All previously set reviewers on the pr are overwritten and reviews are resetted!
    if (inputs.setReviewers === 'true') {
      core.debug('set_reviewers property is set to true')
      pullRequest.setPrReviewers(matchingRule.reviewersRaw)
      return
    }

    // Filter list of reviews by status 'APPROVED'
    const approvedReviews = pullRequest.reviews.filter(
      (review: any) => review.state === 'APPROVED'
    )

    // Check whether all conditions are met
    if (!check.isFulfilled(matchingRule, approvedReviews, reviewers)) {
      throw new Error('Rule is not fulfilled!')
    }
    core.info(`Success! Rule is fulfilled!`)
  } catch (error: any) {
    // Fail the workflow run if an error occurs
    core.setFailed(`Reviewers Action failed! Details: ${error.message}`)
  }
}
