import * as core from '@actions/core';
import * as github from '@actions/github';

import { inputs } from './inputs.js';


export type Reviewers = {
  userReviewers: User[]
  teamReviewers: Team[]
  allReviewers: User[] & Team[]
}

const client = github.getOctokit(inputs.token)
const repo: string = process.env.GITHUB_REPOSITORY ?? ""
const [owner, _] = repo.split('/')

/**
 * Builds entities from the list of reviewers.
 *
 * @returns An array of Entity objects, either User or Team
 */
export function buildEntities(reviewers: string[]): Reviewers {
  core.debug('Building entities...')
  let entities: Reviewers = {
    userReviewers: [],
    teamReviewers: [],
    allReviewers: [],
  }
   for (const reviewer of reviewers) {
    core.debug(`Processing reviewer: ${reviewer}`)

    if (reviewer.startsWith('user:')) {
      entities.userReviewers.push(new User(reviewer))
      entities.allReviewers.push(new User(reviewer))
    } else if (reviewer.startsWith('team:')) {
      entities.teamReviewers.push(new Team(reviewer))
      entities.allReviewers.push(new Team(reviewer))
    } else {
      const [type, _] = reviewer.split('/')
      throw new Error(
        `Invalid reviewer type. Expected one of: 'user', 'team'. Got: ${type}`
      )
    }
  }
  return entities
}

/**
 * Represents a single entity, which can be either a User or a Team.
 *
 * @class Entity
 * @param {string} principle - The principle string in the format 'type:name' e.g., 'user:john'
 * @throws {Error} If the format is invalid
 */
export class Entity {
  principle: string
  type: string
  name: string
  checked: boolean

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
 * @param {string} principle - The principle string in the format 'user:username'
 * @super
 * @throws {Error} If the type is not 'user'
 */
export class User extends Entity {
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
 * @param {string} principle - The principle string in the format 'team:team_name'
 * @super
 * @throws {Error} If the type is not 'team'
 */
export class Team extends Entity {
  members: User[]
  approvalsCounter: number
  neededApprovalsCounter: number

  constructor(principle: string) {
    super(principle)
    if (this.type !== 'team') {
      throw new Error(`Type needs to be of type 'team'. Got: ${this.type}`)
    }

    this.members = []
    this.approvalsCounter = 0
    this.neededApprovalsCounter = this.members.length

    this.#resolveTeam()
  }

  async #getTeamMembers() {
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
    return members
  }

  /**
   * Resolves the team members from the GitHub API.
   *
   * @throws {Error} If there's an issue fetching team members
   */
  async #resolveTeam() {
    core.debug(`Getting members for the team ${this.name}`)
    try {
      const teamMembers = await this.#getTeamMembers()
      this.members = teamMembers.data.map(
        (member: any) => new User(`${member.type}:${member.login}`)
      )
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
   * @param name - The username to check
   * @returns True if the user is in the team, false otherwise
   */
  isMember(name: string): boolean {
    core.debug(`Check if ${name} is member of team ${this.name}`)
    return this.members.some(member => member.name === name)
  }
}
