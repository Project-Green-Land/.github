require('dotenv').config(); // Ensure dotenv is configured before any imports

const { Octokit } = require('@octokit/rest');

const octokit = new Octokit({
  auth: process.env.PROFILE_STATS_TOKEN, // Token for authentication
});

const owner = 'Project-Green-Land'; // Your organization
const repo = '.github'; // The repository name
const titleKeyword = 'Please invite me to the GitHub Community Organization'; // Keyword for filtering issues

// Function to check if a user is already a member
async function checkIfUserIsMember(username) {
  try {
    await octokit.orgs.checkMembershipForUser({
      org: owner,
      username,
    });
    return true;
  } catch (error) {
    if (error.status === 404) return false;
    throw error;
  }
}

// Function to send invitation
async function sendInvitationAndCloseIssue(issue) {
  const isMember = await checkIfUserIsMember(issue.user.login);

  if (isMember) {
    console.log(`User ${issue.user.login} is already a member.`);
    await closeIssue(issue.number, 'User is already a member.');
    return;
  }

  try {
    await octokit.request('POST /orgs/{org}/invitations', {
      org: owner,
      invitee_id: issue.user.id,
    });

    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: issue.number,
      body: `Dear ${issue.user.login}, your invitation to join the GitHub Organization has been sent. Please accept the invitation from your GitHub profile.`,
    });

    await closeIssue(issue.number, 'Invitation sent.');
  } catch (error) {
    console.error('Error sending invitation:', error);
  }
}

// Function to close an issue
async function closeIssue(issueNumber, message) {
  await octokit.issues.update({
    owner,
    repo,
    issue_number: issueNumber,
    state: 'closed',
    state_reason: 'completed',
    body: message,
  });
  console.log(`Issue #${issueNumber} closed: ${message}`);
}

// Process open issues
async function processIssues() {
  let page = 1;
  let hasMoreIssues = true;

  while (hasMoreIssues) {
    try {
      const { data } = await octokit.issues.listForRepo({
        owner,
        repo,
        state: 'open',
        per_page: 100,
        page,
      });

      if (data.length === 0) {
        hasMoreIssues = false;
        break;
      }

      const issuesToProcess = data.filter(issue =>
        issue.title.includes(titleKeyword)
      );

      for (const issue of issuesToProcess) {
        await sendInvitationAndCloseIssue(issue);
      }

      page++;
    } catch (error) {
      console.error('Error fetching issues:', error);
      hasMoreIssues = false;
    }
  }
}

processIssues();
