import * as core from '@actions/core'
import { Octokit } from '@octokit/core'

const token = core.getInput('token', { required: true })
const client = new Octokit({ auth: token })
const repo = process.env.GITHUB_REPOSITORY
const [owner, repoName] = repo.split('/')

class Member {
  constructor() {
    this.approved = false
  }
}

class GithubMember extends Member {
  constructor(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid input: Expected an object.')
    }

    this.login = data.login || null
    this.id = data.id || null
    this.nodeId = data.node_id || null
    this.avatarUrl = data.avatar_url || null
    this.gravatarId = data.gravatar_id || null
    this.profileUrl = data.html_url || null
    this.apiUrl = data.url || null
    this.followersUrl = data.followers_url || null
    this.followingUrl = data.following_url || null
    this.gistsUrl = data.gists_url || null
    this.starredUrl = data.starred_url || null
    this.subscriptionsUrl = data.subscriptions_url || null
    this.organizationsUrl = data.organizations_url || null
    this.reposUrl = data.repos_url || null
    this.eventsUrl = data.events_url || null
    this.receivedEventsUrl = data.received_events_url || null
    this.type = data.type || null
    this.isSiteAdmin = data.site_admin || false
  }
}

class Entity {
  constructor(principle) {
    if (!principle.includes(':'))
      throw new Error("Invalid format. Use '<type>:<name>'")

    const [type, name] = principle.split(':')

    this.principle = principle // Store full string
    this.type = type // 'user' or 'team'
    this.name = name // Extracted name
    this.fulfilled = false
  }
}

class Reviewers {
  constructor(reviewers) {
    this.reviewers = reviewers
    this.entities = this.buildEntitites()
    this.fulfilled = false
  }

  buildEntitites() {
    this.reviewers.map(reviewer => {
      let [type, name] = reviewer.split(':')
      switch (type) {
        case 'user':
          new User(reviewer)
        case 'team':
          new Team(reviewer)
        default:
          throw new Error(
            `Invalid reviewer type. Expected one of: 'user', 'team', Got: ${type}`
          )
      }
    })
  }
}

class User extends Entity {
  constructor(principle) {
    super(principle)
    if (this.type !== 'user') throw new Error("User must have type 'user'")

    this.approved = false
  }

  approve() {
    this.approved = true
    this.fulfilled = true
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
      return members.map(member => new GithubMember(member))
    } catch (error) {
      throw new Error(
        `The members of team ${this.name} could not be retrieved from GitHub. Details: ${error.message}`
      )
    }
  }

  checkFulfillment(fulfillmentType) {
    switch (fulfillmentType) {
      case 'REQUIRE_ALL_APPROVED': {
        this.fulfilled = this.members.every(member => member.approved)
        break
      }
      case 'REQUIRE_SOME_APPROVED': {
        this.fulfilled = this.approvalsCounter > this.neededApprovalsCounter
        break
      }
      case 'REQUIRE_ONE_APPROVED': {
        this.fulfilled = this.approvalsCounter > 0
        break
      }
      default: {
        throw new Error(
          `The fulfillment type ${fulfillmentType} is none of: "REQUIRE_ALL_APPROVED", "REQUIRE_SOME_APPROVED", "REQUIRE_ONE_APPROVED"`
        )
      }
    }
    return this.fulfilled
  }

  updateApprovalsCounter() {
    this.approvalsCounter = 0
    this.members.forEach(() => this.approvalsCounter++)
  }

  approveMember(username) {
    const member = this.members.find(m => m.login === username)
    if (member) {
      member.approved = true
      this.updateApprovalsCounter()
    }
  }
}
