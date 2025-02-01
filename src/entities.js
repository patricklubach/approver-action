import * as core from '@actions/core'

import { inputs } from './inputs'

const client = new core.Octokit({ auth: inputs.token })
const repo = process.env.GITHUB_REPOSITORY
const [owner, repoName] = repo.split('/')

class Reviewers {
  constructor(reviewers) {
    this.reviewers = reviewers
    this.entities = this.buildEntitites()
  }

  buildEntitites() {
    this.reviewers.map(reviewer => {
      let [type, _] = reviewer.split(':')
      switch (type) {
        case 'user':
          new User(reviewer)
        case 'team':
          new Team(reviewer)
        default:
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
    if (this.type !== 'user') throw new Error("User must have type 'user'")
  }
}

class Team extends Entity {
  constructor(principle) {
    super(principle)
    if (this.type !== 'team') throw new Error("Team must have type 'team'")

    this.members = this.resolveTeam()
    this.approvalsCounter = 0
    this.neededApprovalsCounter = this.members.length
  }

  async resolveTeam() {
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
    this.members.forEach(() => this.approvalsCounter++)
  }

  isMember(name) {
    for (const member of this.members) {
      if (member.login === name) {
        return true
      }
    }
    return false
  }
}

export { Reviewers }
