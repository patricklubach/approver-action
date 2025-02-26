"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Team = exports.User = exports.Entity = void 0;
exports.buildEntities = buildEntities;
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const inputs_js_1 = require("./inputs.js");
const client = github.getOctokit(inputs_js_1.inputs.token);
const repo = process.env.GITHUB_REPOSITORY ?? "";
const [owner, _] = repo.split('/');
/**
 * Builds entities from the list of reviewers.
 *
 * @returns An array of Entity objects, either User or Team
 */
function buildEntities(reviewers) {
    core.debug('Building entities...');
    let entities = {
        userReviewers: [],
        teamReviewers: [],
        allReviewers: [],
    };
    for (const reviewer of reviewers) {
        core.debug(`Processing reviewer: ${reviewer}`);
        if (reviewer.startsWith('user:')) {
            entities.userReviewers.push(new User(reviewer));
            entities.allReviewers.push(new User(reviewer));
        }
        else if (reviewer.startsWith('team:')) {
            entities.teamReviewers.push(new Team(reviewer));
            entities.allReviewers.push(new Team(reviewer));
        }
        else {
            const [type, _] = reviewer.split('/');
            throw new Error(`Invalid reviewer type. Expected one of: 'user', 'team'. Got: ${type}`);
        }
    }
    return entities;
}
/**
 * Represents a single entity, which can be either a User or a Team.
 *
 * @class Entity
 * @param {string} principle - The principle string in the format 'type:name' e.g., 'user:john'
 * @throws {Error} If the format is invalid
 */
class Entity {
    principle;
    type;
    name;
    checked;
    constructor(principle) {
        if (!principle.includes(':')) {
            throw new Error("Invalid format. Use '<type>:<name>'");
        }
        const [type, name] = principle.split(':');
        this.principle = `${type}:${name}`;
        this.type = type;
        this.name = name;
        this.checked = false;
    }
}
exports.Entity = Entity;
/**
 * Represents a user in the system.
 *
 * @class User
 * @param {string} principle - The principle string in the format 'user:username'
 * @super
 * @throws {Error} If the type is not 'user'
 */
class User extends Entity {
    constructor(principle) {
        super(principle);
        if (this.type !== 'user') {
            throw new Error(`Principle type needs to be of type 'user'. Got: ${this.type}`);
        }
    }
}
exports.User = User;
/**
 * Represents a team in the system.
 *
 * @class Team
 * @param {string} principle - The principle string in the format 'team:team_name'
 * @super
 * @throws {Error} If the type is not 'team'
 */
class Team extends Entity {
    members;
    approvalsCounter;
    neededApprovalsCounter;
    constructor(principle) {
        super(principle);
        if (this.type !== 'team') {
            throw new Error(`Type needs to be of type 'team'. Got: ${this.type}`);
        }
        this.members = [];
        this.approvalsCounter = 0;
        this.neededApprovalsCounter = this.members.length;
        this.#resolveTeam();
    }
    async #getTeamMembers() {
        const { data: members } = await client.request(`GET /orgs/${owner}/teams/${this.name}/members`, {
            org: owner,
            team_slug: this.name,
            headers: {
                'X-GitHub-Api-Version': '2022-11-28'
            }
        });
        return members;
    }
    /**
     * Resolves the team members from the GitHub API.
     *
     * @throws {Error} If there's an issue fetching team members
     */
    async #resolveTeam() {
        core.debug(`Getting members for the team ${this.name}`);
        try {
            const teamMembers = await this.#getTeamMembers();
            this.members = teamMembers.data.map((member) => new User(`${member.type}:${member.login}`));
        }
        catch (error) {
            throw new Error(`The members of team ${this.name} could not be retrieved from GitHub. Details: ${error.message}`);
        }
    }
    /**
     * Updates the approval counter for each member in the team.
     *
     */
    updateApprovalsCounter() {
        core.debug('Updating approvals counter');
        this.members.forEach(() => this.approvalsCounter++);
    }
    /**
     * Checks if a given username is a member of the team.
     *
     * @param name - The username to check
     * @returns True if the user is in the team, false otherwise
     */
    isMember(name) {
        core.debug(`Check if ${name} is member of team ${this.name}`);
        return this.members.some(member => member.name === name);
    }
}
exports.Team = Team;
