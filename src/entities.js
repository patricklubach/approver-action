import * as core from '@actions/core'
import * as github from '@actions/github'

import { inputs } from './inputs.js'

const client = github.getOctokit({ auth: inputs.token })
const repo = process.env.GITHUB_REPOSITORY
const [owner, repoName] = repo.split('/')

export class Reviewers {
  constructor(reviewers) {
    this.reviewers = reviewers
    this.entities = this.buildEntitites()
  }

  buildEntitites() {
    core.debug(`Building entities...`)
    this.reviewers.map(reviewer => {
      core.debug(`Build entity for reviewer: ${reviewer}`)
      let [type, _] = reviewer.split(':')
      if (type === 'user') {
        core.debug(`Reviewer is of type user`)
        new User(reviewer)
      } else if (type === 'team') {
        core.debug(`Reviewer is of type team`)
        new Team(reviewer)
      } else {
        throw new Error(
          `Invalid reviewer type. Expected one of: 'user', 'team'. Got: ${type}`
        )
      }
    })
  }
}

class Entity {
  constructor(principle) {
    if (!principle.includes(':'))
      throw new Error("Invalid format. Use '<type>:<name>'")

    const [type, name] = principle.split(':')

    this.principle = principle // Store full principle in format: <type>:<name>
    this.type = type // 'user' or 'team'
    this.name = name // Just the username
    this.checked = false
  }
}

class User extends Entity {
  constructor(principle) {
    super(principle)
    if (this.type !== 'user')
      throw new Error(
        `Principle type needs to be of type 'user'. Got: ${this.type}`
      )
  }
}

class Team extends Entity {
  constructor(principle) {
    super(principle)
    if (this.type !== 'team')
      throw new Error(`Type needs to be of type 'team'. Got: ${this.type}`)

    this.members = this.resolveTeam()
    this.approvalsCounter = 0
    this.neededApprovalsCounter = this.members.length
  }

  async resolveTeam() {
    core.debug(`Getting members for the team ${this.name}`)
    try {
      const { data: members } = await client.request(
        `GET /orgs/${owner}/teams/${this.name}/members`,
        {
          org: owner,
          team_slug: this.name,
          headers: {
            'X-GitHub-Api-Version': '2022-11-28'
          }
        }
      )
      return members.map(member => new User(`${member.type}:${member.login}`))
    } catch (error) {
      throw new Error(
        `The members of team ${this.name} could not be retrieved from GitHub. Details: ${error.message}`
      )
    }
  }

  updateApprovalsCounter() {
    core.debug(`Upating approvals counter`)
    this.members.forEach(() => this.approvalsCounter++)
  }

  isMember(name) {
    core.debug(`Check if ${name} is member of team ${this.name}`)
    for (const member of this.members) {
      if (member.login === name) {
        core.debug(`${name} is member of team ${this.name}`)
        return true
      }
    }
    return false
  }
}
