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
exports.PullRequest = void 0;
exports.getPullRequest = getPullRequest;
exports.getReviews = getReviews;
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const inputs_js_1 = require("./inputs.js");
const octokit = github.getOctokit(inputs_js_1.inputs.token);
/**
 * Represents a pull request and provides methods for managing its reviewers.
 *
 * @class
 * @param data - The raw data of the pull request containing details like number, title, and requested reviewers.
 * @param reviews - An array of review objects, each with details about the reviewer (either 'user:username' or 'team:teamname').
 *
 * @property number - The unique identifier for the pull request.
 * @property repo - Contains information about the repository, including its owner and name.
 * @property repo.org - The organization owner's login associated with the repository.
 * @property branchName - The name of the branch the pull request is targeting.
 * @property title - The title of the pull request.
 * @property requestedReviewers - An array of users or teams that have been requested to review the pull request.
 * @property requestedTeams - An array of teams that have been requested to review the pull request.
 * @property reviews - An array of all reviews associated with this pull request.

 * @method setPrReviewers(reviewers) - Sets the reviewers for the pull request by filtering and sending a request to update them.
 *
 * @example
 * const pr = new PullRequest(data, reviews);
 * pr.setPrReviewers(['user:john', 'team:frontend']);
 */
class PullRequest {
    pullRequestRaw;
    number;
    repo;
    branchName;
    title;
    requestedReviewers;
    requestedTeams;
    reviews;
    /**
     * A class representing a pull request with methods to manage its reviews.
     */
    constructor(data, reviews) {
        this.pullRequestRaw = data;
        this.number = this.pullRequestRaw.number;
        this.repo = this.pullRequestRaw.head.repo;
        this.repo.org = this.repo.owner.login;
        this.branchName = this.pullRequestRaw.head.ref;
        this.title = this.pullRequestRaw.title;
        this.requestedReviewers = this.pullRequestRaw.requested_reviewers;
        this.requestedTeams = this.pullRequestRaw.requested_teams;
        this.reviews = reviews;
    }
    /**
     * Sets reviewers for a pull request.
     *
     * @param reviewers - Array of reviewer strings ('user:login' or 'team:team_name').
     * @returns
     * @throws {Error} If there is an error setting the reviewers.
     */
    setPrReviewers(reviewers) {
        try {
            const userReviewers = reviewers.filter(reviewer => reviewer.startsWith('user'));
            const teamReviewers = reviewers.filter(reviewer => reviewer.startsWith('team'));
            core.info(`Setting reviewers for pull request #${this.number}`);
            octokit.rest.pulls.requestReviewers({
                owner: this.repo.owner,
                repo: this.repo.name,
                pull_number: this.number,
                reviewers: userReviewers,
                team_reviewers: teamReviewers
            });
        }
        catch (error) {
            throw new Error(`The reviewers for pull request #${this.number} could not be set. Details: ${error.message}`);
        }
    }
}
exports.PullRequest = PullRequest;
async function getPullRequest(owner, reponame, prNumber) {
    /**
     * Retrieves information about a specific pull request.
     *
     * @param {Object} eventPayload - The context payload containing pull request details
     * @returns {Promise<WebhookPayload>} A promise resolving to a PullRequest object with details like number, repo, title, and more.
     * @throws {Error} If the pull request cannot be retrieved, including any original errors
     */
    core.info(`Getting pull request #${prNumber}`);
    try {
        return await octokit.rest.pulls.get({
            owner: owner,
            repo: reponame,
            pull_number: prNumber
        });
    }
    catch (error) {
        throw new Error(`The pull request could not be retrieved`);
    }
}
async function getReviews(owner, reponame, prNumber) {
    /**
     * Fetches the reviews for a specified pull request.
     *
     * @param {PullRequest} WebhookPayload - The PullRequest instance containing the pull request data
     * @returns {Promise<Object[]>} A promise resolving to an array of review objects with details like user, team, and comment.
     * @throws {Error} If there's an error fetching the reviews
     */
    core.info(`Getting reviewers for pull request #${prNumber}`);
    return await octokit.rest.pulls.listReviews({
        owner: owner,
        repo: reponame,
        pull_number: prNumber
    });
}
