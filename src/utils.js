/*
  This file contains all the helper functions used in main file.
*/

import fs from 'fs'
import yaml from 'yaml'

import core from '@actions/core'

/**
 * Computes a list of approvers from a given list of approver strings.
 * Each string is in the format "type:principle", where type is either "user" or "team".
 * Teams are getting resolved into list of their members.
 *
 * @param {string[]} approvers - An array of strings representing the approvers.
 *                              Each string is in the format "type:principle".
 * @returns {string[]} - A unique array of approvers including both users and team members.
 *
 * @throws Will throw an error if the type is neither "user" nor "team".
 *
 * @example
 * Returns ['user:john', 'user:jane', 'user:mike', 'user:dora']
 * computeApprovers(['user:john', 'team:dev', 'user:jane']);
 *
 * @example
 * Throws an error: "The project "xyz" cannot be verified because it is not of type "user" or "team"!"
 * computeApprovers(['project:xyz']);
 */
function computeApprovers(client, org, approvers) {
  try {
    let expandedApprovers = []

    for (let i = 0; i < approvers.length; i++) {
      let element = approvers[i]
      let type = element.split(':')[0]
      let principle = element.split(':')[1]

      switch (type) {
        case 'user': {
          expandedApprovers.push(element)
          break
        }
        case 'team': {
          let members = getTeamMembers(client, org, principle)
          expandedApprovers.concat(members)
          break
        }
        default: {
          core.setFailed(
            `The ${type} "${principle}" cannot be verified because it is not of type "user" or "team"!`
          )
        }
      }
    }

    return [...new Set(expandedApprovers)]
  } catch (error) {
    core.setFailed(`Cannot compute approvers list. Details: ${error.stack}`)
  }
}

/**
 * Filters a list of reviews based on the "status" key being "APPROVED".
 *
 * @param {Object[]} reviews - The list of reviews to filter. Each object should have a "status" key.
 *
 * @returns {Object[]} - A new list containing only the objects with "status" equal to "APPROVED".
 */
function getApprovals(reviews) {
  try {
    return reviews.filter((item) => { return item.state === 'APPROVED' })
  } catch (error) {
    core.setFailed(
      `Cannot filter reviews for approvals. Details: ${error.stack}`
    )
  }
}

/**
 * Computes a list of approvers who have not yet reviewed.
 *
 * @param {string[]} reviewers - An array of strings representing reviewers who have already reviewed.
 * @param {string[]} approvers - An array of strings representing all potential approvers.
 *
 * @returns {string[]} - An array of approvers who have not yet reviewed.
 */
function getApproversLeft(reviewers, approvers) {
  try {
    let approversLeft = Array.from(approvers)

    for (let i = 0; i < approvers.length; i++) {
      let approver = approvers[i]
      if (reviewers.includes(approver)) {
        let index = approversLeft.indexOf(approver)
        approversLeft.splice(index, 1)
      }
    }

    return approversLeft
  } catch (error) {
    core.setFailed(
      `Cannot compute approvers that still need to approve. Details: ${error.stack}`
    )
  }
}

/**
 * Finds and returns the first rule from the data that matches the given title.
 *
 * @param {string} title - The title to match against the rules.
 * @param {Object[]} data - An array of rule objects, each potentially containing a 'regex' property.
 *
 * @returns {Object|null} - The first matching rule object or null if no match is found.
 *
 * @throws {Error} - Throws an error if no matching rule is found.
 */
function getMatchingRule(title, data) {
  try {
    for (const rule of data) {
      // Check if the rule contains the key and the value matches the regex pattern
      if (
        Object.prototype.hasOwnProperty.call(rule, 'regex') &&
        isMatchingPattern(title, rule['regex'])
      ) {
        return rule // Return the first matching rule
      }
    }
    throw new Error(`No rule defined for title ${title}`)
  } catch (error) {
    core.setFailed(`Cannot get matching rule. Details: ${error.stack}`)
  }
}

/**
 * Retrieves the title of a pull request (PR) from a GitHub repository.
 *
 * @returns {string} - A promise that resolves to the response object containing the PR details.
 *
 * @throws {Error} - Throws an error if the PR title could not be retrieved.
 */
async function getPRTitle(client, owner, repo, pr_number) {
  try {
    return await client.request(
      `GET /repos/${owner}/${repo}/pulls/${pr_number}`,
      {
        owner: owner,
        repo: repo,
        pull_number: pr_number,
        headers: {
          'X-GitHub-Api-Version': '2022-11-28'
        }
      }
    ).title
  } catch (error) {
    core.setFailed(
      `The title could not be retrieved. Details: ${error.stack}`
    )
  }
}

/**
 * Retrieves the reviews for a pull request (PR) from a GitHub repository.
 *
 * @param {Object[]} reviews - A list of reviews
 *
 * @returns {string[]} - An array of all reviewer logins.
 *
 */
async function getReviewers(reviews) {
  try {
    return reviews.map((item) => item.login)
  } catch (error) {
    core.setFailed(`Cannot get reviewers. Details: ${error.stack}`)
  }
}

/**
 * Retrieves the reviews for a pull request (PR) from a GitHub repository.
 *
 * @returns {Promise<Object>} - A promise that resolves to the response object containing the reviews.
 *
 * @throws {Error} - Throws an error if the reviews could not be retrieved.
 */
async function getReviews(client, owner, repo, pr_number) {
  try {
    return await client.request(
      `GET /repos/${owner}/${repo}/pulls/${pr_number}/reviews`,
      {
        owner: owner,
        repo: repo,
        pull_number: pr_number,
        headers: {
          'X-GitHub-Api-Version': '2022-11-28'
        }
      }
    )
  } catch (error) {
    core.setFailed(
      `The reviews could not be retrieved from GitHub. Details: ${error.stack}`
    )
  }
}

/**
 * Retrieves the members of a specific team in a GitHub organization.
 *
 * @param {string} teamSlug - The slug of the team whose members are to be retrieved.
 *
 * @returns {Promise<Object>} - A promise that resolves to the response object containing the team members.
 *
 * @throws {Error} - Throws an error if the team members could not be retrieved.
 */
async function getTeamMembers(client, org, teamSlug) {
  try {
    return await client.request(`GET /orgs/${org}/teams/${teamSlug}/members`, {
      org: org,
      team_slug: teamSlug,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    })
  } catch (error) {
    core.setFailed(
      `The team members of team ${teamSlug} could not be retrieved from GitHub. More information: ${error.stack}`
    )
  }
}

/**
 * Reads and parses YAML data from a given file.
 *
 * @param {string} filePath - The path to the YAML file.
 *
 * @returns {Object} - The parsed YAML data.
 *
 * @throws {Error} - Throws an error if the YAML data could not be read or parsed.
 */
function getYamlData(filePath) {
  try {
    return yaml.parse(fs.readFileSync(filePath, 'utf8'))
  } catch (error) {
    core.setFailed(
      `Cannot get data from approvers file. Details: ${error.stack}`
    )
  }
}

/**
 * This function checks if a string matches a specific regex pattern.
 *
 * @param {string} str - The string to check against the regex pattern.
 * @param {string|RegExp} pattern - The regex pattern to match the string against.
 * @returns {boolean} - Returns true if the string matches the pattern, otherwise false.
 */
function isMatchingPattern(title, pattern) {
  try {
    // Ensure the pattern is a RegExp object if it's provided as a string
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern

    // Test the string against the regex pattern
    return regex.test(title)
  } catch (error) {
    // If there is an error (e.g., invalid regex), log the error and return false
    core.setFailed(`Invalid regex pattern. Details: ${error.stack}`)
  }
}

export {
  computeApprovers,
  getApprovals,
  getApproversLeft,
  getMatchingRule,
  getPRTitle,
  getReviewers,
  getReviews,
  getTeamMembers,
  getYamlData,
  isMatchingPattern
}
