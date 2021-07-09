module.exports = (app, { getRouter }) => {
	app.on(
		[
			"issue_comment.created",
			"issue_comment.edited"
		],
		async context => {
			const config = await context.config("commentagent.yml", {
				caseSensitive: true
			});

			if (!config) {
				console.log('Config file named "commentagent.yml" not found. Exiting.');
				return;
			}

			if (context.payload.issue != null) {
				console.log('Not a PR. Exiting.')
			}

			if (typeof config.aliasMappings === 'undefined' || config.aliasMappings === null) {
				console.log('No alias mappings specified in the config. Exiting.')
			}

			var issueComment = context.payload.issue_comment;

			let commentBody = issueComment.comment.body.slice();
			let PRNumber = issueComment.issue.number;
			let repoName = issueComment.repository.full_name;

			let commentAuthorName = issueComment.comment.user.login;
			let commentAuthorAssociation = issueComment.comment.author_association;

			let metadata = {
				pr_number: PRNumber,
				comment_author: commentAuthorName,
				pr_head_full_repo_name: PRHeadFullName,
				pr_head_ref: PRHeadRef,
			}

			let PRData = await octokit.request(`GET /repos/${repoName}/pulls/${PRNumber}`);
			let PRHeadRef = PRData.head.ref;
			let PRHeadFullName = PRData.head.full_name;
			let PRAuthor = PRData.user.login;

			if (config.caseSensitive === false) {
				commentBody = commentBody.toLowerCase();
			}

			for (let token in config.aliasMappings) {
				let tokenName = token.slice();
				let eventName = config.labelMappings[token];

				if (config.caseSensitive === false) {
					tokenName = tokenName.toLowerCase();
				}

				if (commentBody.includes(tokenName)) {
					if (isAuthorized(commentAuthorAssociation, eventName, PRAuthor, commentAuthorName)) {
						reactComment(context, issueComment.repository.name, issueComment.repository.owner.login, issueComment.comment.id, "eyes");
						sendDispatch(context, issueComment, eventName, metadata);
						reactComment(context, issueComment.repository.name, issueComment.repository.owner.login, issueComment.comment.id, "rocket");
					}
				}
			}
		}
	);
};

function sendDispatch(context, issueComment, event_type, metadata) {
	context.octokit.rest.repos.createDispatchEvent(
		{
			owner: issueComment.repository.owner.login,
			repo: issueComment.repository.name,
			event_type: event_type,
			client_payload: metadata
		}
	);
}

function isAuthorized(association, event, pr_author, comment_author) {
	let map = config.permissionMappings;

	// If no permission map is specified at all, default to member
	if (typeof map === 'undefined' || map === null) {
		if (association == 'MEMBER' || association == 'OWNER') {
			return true;
		} else {
			return false;
		}
	}

	if (association == 'PRAUTHOR' && pr_author == comment_author) {
		return true
	}

	let permission = map[event];
	if (Array.isArray(permission)) {
		return permission.includes(association);
	}
	else if (typeof permission === 'string') {
		return association == permission;
	}
	else {
		return false;
	}
}

function reactComment(context, owner, repo, id, reaction) {
	context.octokit.rest.reactions.createForIssueComment({
		owner,
		repo,
		comment_id: id,
		content: reaction,
	});
}
