// --- Configuration ---
const ADMIN_BOT_ID = 'YOUR_BOT_MESSENGER_ID'; // Replace with your bot's Messenger ID
const KICK_MESSAGE_PREFIX = 'User kicked for using forbidden language: ';

// --- In-memory storage for bad words (replace with persistent storage in production) ---
// Key: groupId, Value: Array of bad words
const groupBadWords = {};
// Key: groupId, Value: The message ID of the last bad word list sent by the bot
const lastBadWordListMessageId = {};

// --- Function to handle incoming messages ---
async function handleMessage(message) {
    const senderId = message.sender.id;
    const groupId = message.thread_id; // Or equivalent for your platform
    const messageText = message.text ? message.text.toLowerCase() : '';
    const repliedToMessageId = message.replied_to_message_id; // Get the ID of the message this one is replying to
    const repliedToSenderId = message.replied_to_sender_id; // Get the sender ID of the message this one is replying to

    // Initialize bad words for the group if not already present
    if (!groupBadWords[groupId]) {
        groupBadWords[groupId] = [];
    }

    // Check if the sender is an admin (crucial for admin commands)
    const isSenderAdmin = await checkIfUserIsAdmin(groupId, senderId); // Implement this function

    // --- Admin Commands ---
    if (isSenderAdmin) {
        // .badwordpro command
        if (messageText.startsWith('.badwordpro')) {
            const commandArgs = messageText.substring('.badwordpro'.length).trim();
            if (commandArgs) {
                const newBadWords = commandArgs.split(',').map(word => word.trim().toLowerCase());
                groupBadWords[groupId] = [...new Set([...groupBadWords[groupId], ...newBadWords])]; // Add new words, ensure uniqueness
                await sendMessage(groupId, 'Bad words updated for this group!');
            } else {
                await sendMessage(groupId, 'Please provide bad words after the command, separated by commas. Example: .badwordpro word1,word2');
            }
            return; // Stop processing further if it's an admin command
        }

        // .badwordsremove command
        if (messageText === '.badwordsremove') {
            const currentWords = groupBadWords[groupId];
            if (currentWords.length === 0) {
                await sendMessage(groupId, 'No bad words currently set for this group.');
                return;
            }

            let listMessage = 'Current bad words:\n';
            currentWords.forEach((word, index) => {
                listMessage += `${index + 1}. ${word}\n`;
            });
            listMessage += '\nReply to this message with the number of the bad word you want to remove.';

            const sentMessage = await sendMessage(groupId, listMessage); // Send the list
            if (sentMessage && sentMessage.message_id) {
                lastBadWordListMessageId[groupId] = sentMessage.message_id; // Store the ID of the list message
            }
            return; // Stop processing further if it's an admin command
        }

        // Handling replies to the .badwordsremove list
        if (repliedToMessageId === lastBadWordListMessageId[groupId] && repliedToSenderId === ADMIN_BOT_ID) {
            const badWordIndex = parseInt(messageText);
            const currentWords = groupBadWords[groupId];

            if (!isNaN(badWordIndex) && badWordIndex > 0 && badWordIndex <= currentWords.length) {
                const removedWord = currentWords.splice(badWordIndex - 1, 1)[0];
                groupBadWords[groupId] = currentWords; // Update the list (splice modifies in place, but reassigning is good practice for some storage types)
                await sendMessage(groupId, `Removed "${removedWord}" from the bad word list.`);
                delete lastBadWordListMessageId[groupId]; // Clear the stored message ID
            } else {
                await sendMessage(groupId, 'Invalid number. Please reply with a valid number from the list.');
            }
            return; // Stop processing further if it's a reply to the remove command
        }
    }

    // --- Bad Word Detection for all users ---
    const currentBadWords = groupBadWords[groupId];

    // Check if the bot is an admin in the group (this requires API access)
    const isBotAdmin = await checkIfBotIsAdmin(groupId, ADMIN_BOT_ID); // Implement this function

    if (isBotAdmin && currentBadWords && currentBadWords.length > 0) {
        for (const badWord of currentBadWords) {
            if (messageText.includes(badWord)) {
                const reason = `${KICK_MESSAGE_PREFIX}"${badWord}"`;
                await sendMessage(groupId, reason);
                await kickUser(groupId, senderId); // Implement this function
                break; // Kick for the first bad word found
            }
        }
    }
}

// --- Placeholder functions (implement these using your bot platform's API) ---

/**
 * Sends a message to a specific group or user.
 * Returns the message object, potentially containing a message_id.
 * @param {string} recipientId - The ID of the group or user to send the message to.
 * @param {string} text - The message text.
 * @returns {Promise<object|null>} - The sent message object or null on failure.
 */
async function sendMessage(recipientId, text) {
    console.log(`Sending message to ${recipientId}: ${text}`);
    // Your bot platform's API call to send a message
    // Example (pseudo-code):
    // const response = await botPlatform.sendMessage(recipientId, text);
    // return { message_id: response.message_id }; // Return relevant parts
    return { message_id: `mock_message_${Date.now()}` }; // Mock for demonstration
}

/**
 * Checks if the bot is an administrator in the specified group.
 * This is crucial and requires specific API permissions from Messenger/your platform.
 * @param {string} groupId - The ID of the group.
 * @param {string} botId - The Messenger ID of your bot.
 * @returns {Promise<boolean>} - True if the bot is an admin, false otherwise.
 */
async function checkIfBotIsAdmin(groupId, botId) {
    console.log(`Checking if bot ${botId} is admin in group ${groupId}`);
    // Implement this using your bot platform's API to query group member roles.
    // Example (pseudo-code):
    // const groupAdmins = await botPlatform.getGroupAdmins(groupId);
    // return groupAdmins.includes(botId);
    return true; // For demonstration. **Implement this carefully in production.**
}

/**
 * Checks if a specific user is an administrator in the specified group.
 * This is crucial for admin-only commands.
 * @param {string} groupId - The ID of the group.
 * @param {string} userId - The ID of the user to check.
 * @returns {Promise<boolean>} - True if the user is an admin, false otherwise.
 */
async function checkIfUserIsAdmin(groupId, userId) {
    console.log(`Checking if user ${userId} is admin in group ${groupId}`);
    // Implement this using your bot platform's API to query user roles within the group.
    // This is often done by getting group members and checking their 'role' or 'admin' status.
    // Example (pseudo-code):
    // const userRole = await botPlatform.getUserRoleInGroup(groupId, userId);
    // return userRole === 'admin';
    // For now, let's assume a hardcoded admin for testing or allow everyone for initial setup.
    // return true; // For testing purposes, assumes sender is admin. **Change this for production.**

    // Replace with actual admin check logic. Example:
    // const admins = await getGroupAdmins(groupId); // You'd need a function to fetch admins
    // return admins.includes(userId);
    // Or, if you have a list of pre-approved admin IDs:
    const preApprovedAdmins = ['YOUR_ADMIN_MESSENGER_ID_1', 'YOUR_ADMIN_MESSENGER_ID_2']; // Replace with actual admin IDs
    return preApprovedAdmins.includes(userId);
}


/**
 * Kicks a user from a group.
 * This function requires administrative privileges for your bot in the group.
 * @param {string} groupId - The ID of the group.
 * @param {string} userId - The ID of the user to kick.
 */
async function kickUser(groupId, userId) {
    console.log(`Kicking user ${userId} from group ${groupId}`);
    // Your bot platform's API call to kick a user
    // Example (pseudo-code): await botPlatform.kickUser(groupId, userId);
}

// --- How to use this (conceptual) ---
// Your bot platform will likely have an event listener that calls a function
// like `handleMessage` when a new message arrives.

// Example of how an incoming message might trigger `handleMessage`:
// someBotPlatform.on('message', handleMessage);
