/*
  This file contains all the helper functions used in main file.
*/

import fs from 'fs'
import YAML from 'yaml'

import * as core from '@actions/core'


function getReviews(client, owner, repo, pr_number) {
  core.info(`Getting reviews of pull request #${pr_number}`)
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
    throw new Error(
      `The reviews could not be retrieved from GitHub. Details: ${error.message}`
    )
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
    throw new Error(`Cannot filter reviews for approvals. Details: ${error.message}`)
  }
}

function getApprovers(reviews) {
  core.info('Filter list of reviews for users which approved yet')
  try {
    let reviewers = []
    for (const review of reviews) {
      if (review.state == 'APPROVED') {
        reviewers.push(['user', review.user.login].join(':'))
      }
    }
    core.info(`Following users reviewed and approved yet: ${reviewers}`)
    return reviewers
  } catch (error) {
    throw new Error(`Cannot get reviewers. Details: ${error.message}`)
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
  } catch (error) {
    throw new Error(
      `The pull request could not be retrieved. Details: ${error.message}`
    )
  }
}

function getYamlData(filePath) {
  core.info(`Reading approver file ${filePath}`)
  try {
    return YAML.parse(fs.readFileSync(filePath, 'utf8'))
  } catch (error) {
    throw new Error(
      `Cannot get data from approvers file. Details: ${error.message}`
    )
  }
}

function getMatchingRule(checkOn, data) {
  core.info(`Trying to find rule that matches "${checkOn}"`)
  for (const rule of data) {
    // Check if the rule contains the key 'regex' and the value matches the regex pattern
    if (
      Object.prototype.hasOwnProperty.call(rule, 'regex') &&
      isMatchingPattern(checkOn, rule['regex'])
    ) {
      core.info(`Rule with regex "${rule.regex}" matches "${checkOn}"`)
      return rule
    }
  }
  core.warning(
    `No rule regex matches "${checkOn}". Trying to fallback to default rule`
  )
  for (const rule of data) {
    if (Object.prototype.hasOwnProperty.call(rule, 'default')) {
      core.info('Default rule found.')
      return rule
    }
  }
  throw new Error('No matching rule found.')
}

function isMatchingPattern(checkOn, pattern) {
  try {
    // Ensure the pattern is a RegExp object if it's provided as a string
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern

    // Test the string against the regex pattern
    const result = regex.test(checkOn)
    core.debug(`Check that "${checkOn}" matches regex ${pattern} => ${result}`)
    return result
  } catch (error) {
    // If there is an error (e.g., invalid regex), log the error and return false
    throw new Error(`Invalid regex pattern. Details: ${error.message}`)
  }
}

function reviewersSet(pullRequest, desiredReviewers) {
  core.info('Checking which reviewers are already set on pr')
  const userReviewers = desiredReviewers.filter(reviewer =>
    reviewer.startsWith('user')
  )
  const teamReviewers = desiredReviewers.filter(reviewer =>
    reviewer.startsWith('team')
  )

  const requestedReviewerUsers = pullRequest.requested_reviewers
  const requestedReviewerTeams = pullRequest.requested_teams

  // Check if desired reviewers are already assigned to the pr
  requestedReviewerUsers.forEach(reviewer => {
    if (!userReviewers.includes(reviewer)) {
      core.info(
        `Reviewer user ${reviewer} is not in requested reviewers of PR #${pullRequest.number}, updating reviewer of PR`
      )
      return false
    }
  })

  // Check if desired reviewers are already assigned to the pr
  requestedReviewerTeams.forEach(reviewerTeam => {
    if (!teamReviewers.includes(reviewerTeam)) {
      core.info(
        `Reviewer team ${reviewerTeam} is not in requested reviewers of PR #${pullRequest.number}`
      )
      return false
    }
  })

  return true
}

function setPrReviewers(client, owner, repo, pullRequest, reviewers) {
  try {
    if (!reviewersSet(pullRequest, reviewers)) {
      const userReviewers = desiredReviewers.filter(reviewer =>
        reviewer.startsWith('user')
      )
      const teamReviewers = desiredReviewers.filter(reviewer =>
        reviewer.startsWith('team')
      )

      core.info(`Setting reviewers for pull request #${pullRequest.number}`)
      const url = `/repos/${owner}/${repo}/pulls/${pullRequest.number}/requested_reviewers`
      core.debug(`Setting reviewers on endpoint: ${url}`)
      return client.request(`POST ${url}`, {
        owner: owner,
        repo: repo,
        pull_number: pullRequest.number,
        reviewers: userReviewers,
        team_reviewers: teamReviewers,
        headers: {
          'X-GitHub-Api-Version': '2022-11-28'
        }
      })
    }
  } catch (error) {
    throw new Error(
      `The reviewers for pull request #${pullRequest.number} could not be set. Details: ${error.message}`
    )
  }
}

function expandReviewers(client, org, reviewers) {
  core.info('Expand list of reviewers and resolve teams to users')
  try {
    let expandedReviewers = []

    for (let i = 0; i < reviewers.length; i++) {
      let approver = reviewers[i]
      const [type, principle] = approver.split(':')

      switch (type) {
        case 'user': {
          expandedReviewers.push(approver)
          break
        }
        case 'team': {
          let members = getTeamMembers(client, org, principle)
          core.debug(`Resolved team ${principle} to ${members}`)
          expandedReviewers.concat(members)
          break
        }
        default: {
          throw new Error(
            `The ${type} "${principle}" cannot be verified because it is not of type "user" or "team"!`
          )
        }
      }
    }
    core.debug(`List of expanded reviewers: ${expandedReviewers}`)
    return [...new Set(expandedReviewers)]
  } catch (error) {
    throw new Error(`Cannot expand reviewers list. Details: ${error.message}`)
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
  } catch (error) {
    throw new Error(
      `The team members of team ${teamSlug} could not be retrieved from GitHub. More information: ${error.message}`
    )
  }
}

function createReviewersMapping(client, org, reviewers) {
  const reviewersMapping = new Map()

  reviewers.forEach(reviewer => {
    let [type, principle] = reviewer.split(':')

    switch (type) {
      case 'user': {
        reviewersMapping.set(reviewer, [principle])
        break
      }
      case 'team': {
        let { data: members } = getTeamMembers(client, org, principle)
        reviewersMapping.set(
          reviewer,
          members.map(member => {
            return member.login
          })
        )
        break
      }
      default: {
        throw new Error(
          `The ${type} "${principle}" cannot be verified because it is not of type "user" or "team"!`
        )
      }
    }
  })

  return reviewersMapping
}

function getReviewersLeft(
  client,
  org,
  desiredReviewers,
  approvers,
  type,
  amount = 0
) {
  core.info('Checking if approvals are still needed')
  core.debug(`Desired reviewers are: ${desiredReviewers}`)
  core.debug(`Users which approved yet: ${approvers}`)
  core.debug(`Type is: ${type}`)

  const reviewersMapping = createReviewersMapping(client, org, desiredReviewers)

  const reviewers = []

  for (const reviewer of reviewersMapping.values()) {
    reviewers.push(reviewer)
  }

  core.info('Determine if approvals are still needed')
  switch (type) {
    case 'ALL':
      if (reviewers.length == approvers.length) {
        return
      } else {
        throw new Error('Not enough approvals!')
      }
    case 'AMOUNT':
      if (approvers.length >= desiredReviewers.length) {
        return
      } else {
        throw new Error('Not enough approvals!')
      }
    case 'ONE_OF_EACH':
      break
    default:
      core.info(
        `Reviewer ${reviewer} is not in requested reviewers of PR #${pullRequest.number}`
      )
      throw new Error(`'type' property is misconfigured. Allowed values are: [ALL, AMOUNT
        ONE_OF_EACH]. Got: ${type}`)
  }
}

export {
  getApprovals,
  getApprovers,
  getMatchingRule,
  getPullRequest,
  getReviewersLeft,
  getReviews,
  getTeamMembers,
  getYamlData,
  isMatchingPattern,
  setPrReviewers
}

/*
case 1: only users are defined => all users have to approve
case 2: users and teams are defined
  - if user is in reviewers file directly it counts for the user
  - if user is in reviewers file directly and user is in group it counts for the user and not for the group
  - if user is not defined in the reviewers file directly and is member of group then it counts for the group
case 3: only teams are defined =>
  - at least one of each group needs to approve. this counts for the first group the user was found in
**/
