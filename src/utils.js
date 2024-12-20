/*
  This file contains all the helper functions used in main file.
*/

import fs from 'fs'
import YAML from 'yaml'

import * as core from '@actions/core'

function getReviews(client, owner, repo, pr_number) {
  core.info(`Get reviews of pull request #${pr_number}`)
  try {
    const url = `/repos/${owner}/${repo}/pulls/${pr_number}/reviews`
    core.debug(`Fetching reviews from endpoint: ${url}`)
    return client.request(`GET ${url}`, {
      owner: owner,
      repo: repo,
      pull_number: pr_number,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    })
  } catch(error) {
    core.error(
      `The reviews could not be retrieved from GitHub. Details: ${error.message}`
    )
    throw error
  }
}

function getApprovals(reviews) {
  core.info('Getting list of approvals')
  try {
    let approvals = []
    for(let n = 0, len = reviews.length; n < len; ++n) {
      let review = reviews[n]
      core.debug(
        `User ${review.user.login} ${review.state} PR at ${review.submitted_at}`
      )
      if(review.state === 'APPROVED') {
        approvals.push(review)
      }
    }
    return approvals
  } catch(error) {
    core.error(`Cannot filter reviews for approvals. Details: ${error.message}`)
    throw error
  }
}

function getApprovers(reviews) {
  core.info('Filter reviews for users which approved yet')
  try {
    let reviewers = []
    for(const review of reviews) {
      if(review.state == 'APPROVED') {
        reviewers.push([
          "user",
          review.user.login].join(":"))
      }
    }
    core.info(`Following user reviewed and approved yet: ${reviewers}`)
    return reviewers
  } catch(error) {
    core.error(`Cannot get reviewers. Details: ${error.message}`)
    throw error
  }
}

function getPullRequest(client, owner, repo, pr_number) {
  core.info('Getting pull request')
  try {
    const url = `/repos/${owner}/${repo}/pulls/${pr_number}`
    core.debug(`Fetching pull request from endpoint: ${url}`)
    return client.request(`GET ${url}`, {
      owner: owner,
      repo: repo,
      pull_number: pr_number,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    })
  } catch(error) {
    core.error(
      `The pull request could not be retrieved. Details: ${error.message}`
    )
    throw error
  }
}

function getYamlData(filePath) {
  core.info(`Reading approver file ${filePath}`)
  try {
    return YAML.parse(fs.readFileSync(filePath, 'utf8'))
  } catch(error) {
    core.error(`Cannot get data from approvers file. Details: ${error.message}`)
    throw error
  }
}

function getMatchingRule(title, data) {
  core.info(`Finding matching rule that matches pull request title ${title}`)
  try {
    for(const rule of data) {
      // Check if the rule contains the key and the value matches the regex pattern
      if(
        Object.prototype.hasOwnProperty.call(rule, 'regex') &&
        isMatchingPattern(title, rule['regex'])
      ) {
        core.info(`Rule with regex "${rule.regex}" matches title "${title}"`)
        return rule // Return the first matching rule
      }
    }
    throw new Error(`No rule defined for title ${title}`)
  } catch(error) {
    core.error(`Cannot get matching rule. Details: ${error.message}`)
    throw error
  }
}

function isMatchingPattern(title, pattern) {
  try {
    // Ensure the pattern is a RegExp object if it's provided as a string
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern

    // Test the string against the regex pattern
    const result = regex.test(title)
    core.debug(`Title ${title} match regex ${pattern} => ${result}`)
    return result
  } catch(error) {
    // If there is an error (e.g., invalid regex), log the error and return false
    core.error(`Invalid regex pattern. Details: ${error.message}`)
    throw error
  }
}

function computeApprovers(client, org, approvers) {
  core.info('Resolving teams from list of approvers')
  try {
    let expandedApprovers = []

    for(let i = 0; i < approvers.length; i++) {
      let approver = approvers[i]
      let [type, principle] = approver.split(':')

      switch(type) {
        case 'user': {
          expandedApprovers.push(approver)
          break
        }
        case 'team': {
          let members = getTeamMembers(client, org, principle)
          core.debug(`Resolved team ${principle} to ${members}`)
          expandedApprovers.concat(members)
          break
        }
        default: {
          throw new Error(
            `The ${type} "${principle}" cannot be verified because it is not of type "user" or "team"!`
          )
        }
      }
    }
    core.debug(`List of expanded approvers: ${expandedApprovers}`)
    return [...new Set(expandedApprovers)]
  } catch(error) {
    core.error(`Cannot compute approvers list. Details: ${error.message}`)
    throw error
  }
}

function getApproversLeft(desiredApprovers, approvers) {
  core.info('Checking if approvals are still needed')
  try {
    core.debug(`Users which approved yet: ${approvers.sort()}`)
    core.debug(`Users which need to approve: ${desiredApprovers.sort()}`)

    if(JSON.stringify(desiredApprovers) === JSON.stringify(approvers)) {
      core.debug(`Successfully checked`)
      return
    } else {
      throw new Error('There are still approvals needed.')
    }
  } catch(error) {
    core.error(
      `Check is not fulfilled. Details: ${error.message}`
    )
    throw error
  }
}

async function getTeamMembers(client, org, teamSlug) {
  core.info('Resolve teams into list of members')
  try {
    return await client.request(`GET /orgs/${org}/teams/${teamSlug}/members`, {
      org: org,
      team_slug: teamSlug,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    })
  } catch(error) {
    core.error(
      `The team members of team ${teamSlug} could not be retrieved from GitHub. More information: ${error.message}`
    )
    throw error
  }
}

export {
  computeApprovers,
  getApprovals,
  getApprovers,
  getApproversLeft,
  getMatchingRule,
  getPullRequest,
  getReviews,
  getTeamMembers,
  getYamlData,
  isMatchingPattern
}
