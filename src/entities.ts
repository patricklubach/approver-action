import * as core from '@actions/core'
import * as github from '@actions/github'

import { inputs } from './inputs.js'

const client = github.getOctokit(inputs.token)
const repo: string | undefined = process.env.GITHUB_REPOSITORY
const [owner, repoName] = repo.split('/')

/**
 * Represents a collection of reviewers who have been configured to validate pull requests.
 *
 * @class Reviewers
 */
export class Reviewers {
  reviewers: Array<string>
  entities: Array<Entity>
  /**
   * Constructs an instance of `Reviewers` with the provided list of reviewers.
   * Each reviewer can be in the format 'user:username' or 'team:team_name'.
   *
   * @param {Array} reviewers - Array of strings specifying reviewers in the format 'user:username' or 'team:team_name'
   */
  constructor(reviewers: Array<string>) {
    this.reviewers = reviewers
    this.entities = this.#buildEntities()
  }

  /**
   * Builds entities from the list of reviewers.
   *
   * @param {Array} reviewers - Array of reviewer strings
   * @returns {Array} An array of Entity objects, either User or Team
   */
  #buildEntities(): Array<Entity> {
    core.debug('Building entities...')
    return this.reviewers.map(reviewer => {
      const [type, name] = reviewer.split(':')
      core.debug(`Processing reviewer: ${reviewer}`)

      if (type === 'user') {
        return new User(`${type}:${name}`)
      } else if (type === 'team') {
        return new Team(`${type}:${name}`)
      } else {
        throw new Error(
          `Invalid reviewer type. Expected one of: 'user', 'team'. Got: ${type}`
        )
      }
    })
  }
}

/**
 * Represents a single entity, which can be either a User or a Team.
 *
 * @class Entity
 */
class Entity {
  principle: string
  type: string
  name: string
  checked: boolean
  /**
   * Constructs an Entity from the given principle string in the format 'type:name'.
   *
   * @param {string} principle - The principle string in the format 'type:name' e.g., 'user:john'
   * @throws {Error} If the format is invalid
   */
  constructor(principle: string) {
    if (!principle.includes(':')) {
      throw new Error("Invalid format. Use '<type>:<name>'")
    }

    const [type, name] = principle.split(':')
    this.principle = `${type}:${name}`
    this.type = type
    this.name = name
    this.checked = false
  }
}

/**
 * Represents a user in the system.
 *
 * @class User
 */
class User extends Entity {
  /**
   * Constructs a new User entity from the given principle string.
   *
   * @param {string} principle - The principle string in the format 'user:username'
   * @super
   * @throws {Error} If the type is not 'user'
   */
  constructor(principle: string) {
    super(principle)
    if (this.type !== 'user') {
      throw new Error(
        `Principle type needs to be of type 'user'. Got: ${this.type}`
      )
    }
  }
}

/**
 * Represents a team in the system.
 *
 * @class Team
 */
class Team extends Entity {
  members: Array<User>
  approvalsCounter: number
  neededApprovalsCounter: number
  /**
   * Constructs a new Team entity from the given principle string.
   * populates team members and other properties.
   *
   * @param {string} principle - The principle string in the format 'team:team_name'
   * @super
   * @throws {Error} If the type is not 'team'
   */
  constructor(principle: string) {
    super(principle)
    if (this.type !== 'team') {
      throw new Error(`Type needs to be of type 'team'. Got: ${this.type}`)
    }

    this.members = this.resolveTeam()
    this.approvalsCounter = 0
    this.neededApprovalsCounter = this.members.length
  }

  /**
   * Resolves the team members from the GitHub API.
   *
   * @returns {Array} An array of User objects representing the team members
   * @throws {Error} If there's an issue fetching team members
   */
  async resolveTeam(): Promise<User[]> {
    core.debug(`Getting members for the team ${this.name}`)
    try {
      const response = await client.request(
        `GET /orgs/${owner}/teams/${this.name}/members`,
        {
          org: owner,
          team_slug: this.name,
          headers: {
            'X-GitHub-Api-Version': '2022-11-28'
          }
        }
      )
      const members: Array<User> = response.data.map(
        (member: any) => new User(`${member.type}:${member.login}`)
      )
      return members
    } catch (error: any) {
      throw new Error(
        `The members of team ${this.name} could not be retrieved from GitHub. Details: ${error.message}`
      )
    }
  }

  /**
   * Updates the approval counter for each member in the team.
   *
   */
  updateApprovalsCounter() {
    core.debug('Updating approvals counter')
    this.members.forEach(() => this.approvalsCounter++)
  }

  /**
   * Checks if a given username is a member of the team.
   *
   * @param {string} name - The username to check
   * @returns {boolean} True if the user is in the team, false otherwise
   */
  isMember(name: string) {
    core.debug(`Check if ${name} is member of team ${this.name}`)
    return this.members.some(member => member.name === name)
  }
}
