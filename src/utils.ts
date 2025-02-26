/*
  This file contains all the helper functions used in main file.
*/

import * as core from '@actions/core'

import { PullRequest } from './pullrequest.js'

/**
 * Validates if the event name is either 'pull_request' or 'pull_request_review'.
 * If not, throws an error indicating unsupported event type.
 *
 * @param eventName - The name of the event to validate
 * @throws Error - If the event type is not supported
 */
export function validateEvent(eventName: string) {
  core.debug(`Validating if event type '${eventName}' is supported`)
  if (!['pull_request', 'pull_request_review'].includes(eventName)) {
    throw new Error(
      `Unsupported event type! Supporing: ["pull_request", "pull_request_review"]. Got: ${eventName}`
    )
  }
  core.debug(`Event type '${eventName}' is supported`)
}

/**
 * Determines the condition value based on the given type.
 *
 * @param conditionType - Type of condition ('branch_name' or 'title')
 * @param pullRequest - Pull request object containing necessary data
 * @returns Corresponding condition value
 * @throws Error - If invalid condition type is provided
 */
export function getCondition(
  conditionType: string,
  pullRequest: PullRequest
): string {
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
