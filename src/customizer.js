import getAPI from './api';
import getWindow from './window';

const api = getAPI();
const thisWindow = getWindow();

/**
 * Run a function whenever a specific setting changes.
 *
 * The callback will receive two arguments:
 *
 * 1. The setting Id
 * 2. The new setting value
 *
 * @param {string} settingId - The setting name.
 * @param {function} callback - The function to call when a setting changes.
 */
export function onSettingChange( settingId, callback ) {
	api( settingId, setting => setting.bind( () => callback( settingId, getSettingValue( settingId ) ) ) );
}

/**
 * Run a function whenever any setting changes.
 *
 * The callback will receive two arguments:
 *
 * 1. The setting Id
 * 2. The new setting value
 *
 * @param {function} callback - The function to call when a setting changes.
 */
export function onChange( callback ) {
	api.bind( 'change', setting => callback( setting.id, getSettingValue( setting.id ) ) );
}

/**
 * Return true if any setting has changed.
 *
 * @return {boolean} True if any setting has changed.
 */
export function areSettingsChanged() {
	return getAllSettingIds().some( isSettingChanged );
}

/**
 * Return an object of changed settings.
 *
 * Each key is a setting Id, and each value is the setting value.
 *
 * @return {Object} All changed settings.
 */
export function getChangedSettings() {
	return getAllSettingIds()
	.filter( isSettingChanged )
	.reduce( ( settings, settingId ) => {
		settings[ settingId ] = getSettingValue( settingId );
		return settings;
	}, {} );
}

/**
 * Return true if this script is running in the preview.
 *
 * Returns false if the script is running in the control frame.
 *
 * @return {boolean} True if this is the preview frame.
 */
export function isPreviewFrame() {
	return typeof api.preview !== 'undefined';
}

/**
 * Changes a setting value.
 *
 * @param {string} settingId - The setting name.
 * @param {*} value - The new setting value.
 */
export function changeSettingValue( settingId, value ) {
	if ( isPreviewFrame() ) {
		const parentApi = getParentApi();
		if ( ! parentApi ) {
			return;
		}
		changeSettingValueForApi( parentApi, settingId, value );
	}
	changeSettingValueForApi( api, settingId, value );
}

/**
 * Return the current value of a setting.
 *
 * @param {string} settingId - The setting name.
 * @return {*} The setting value.
 */
export function getSettingValue( settingId ) {
	return api.get()[ settingId ];
}

/**
 * Return all setting Ids.
 *
 * @return {Array} All the setting names.
 */
export function getAllSettingIds() {
	return Object.keys( api.get() );
}

/**
 * Return true if the setting has changed.
 *
 * @param {string} settingId - The setting name.
 * @return {boolean} True if the setting has changed.
 */
export function isSettingChanged( settingId ) {
	return api.instance( settingId )._dirty;
}

/**
 * Force the preview frame to reload.
 */
export function reloadPreview() {
	if ( api.previewer ) {
		api.previewer.refresh();
	}
	const parentApi = getParentApi();
	if ( parentApi && parentApi.previewer ) {
		parentApi.previewer.refresh();
	}
}

/**
 * Send an event to the other frame.
 *
 * If the current frame is the parent frame, this sends a message to the preview
 * frame. If the current frame is the preview frame, this sends a message to the
 * parent frame.
 *
 * The event can be handled by using `handleEvent`.
 *
 * @param {string} eventId - The event Id to send.
 * @param {*} data - The event payload to send.
 */
export function sendEvent( eventId, data ) {
	getPreviewObject().send( eventId, data );
}

/**
 * Handle a custom event from the other frame.
 *
 * If the current frame is the parent frame, this listens to messages from the
 * preview frame. If the current frame is the preview frame, this listens to
 * messages from the parent frame.
 *
 * The event can be sent using `sendEvent`.
 *
 * The callback function will receive one parameter:
 *
 * 1. The payload data sent by the sender.
 *
 * @param {string} eventId - The event Id to listen for.
 * @param {function} callback - The function to call when the event is heard.
 */
export function handleEvent( eventId, callback ) {
	getPreviewObject().bind( eventId, callback );
}

/**
 * Remove a custom event handler.
 *
 * Removes a handler from this frame that was added using `handleEvent`.
 *
 * If no callback is passed, this will remove all callbacks for the event.
 *
 * @param {string} eventId - The event Id to listen for.
 * @param {function} [callback] - The same function added in `handleEvent` or null.
 */
export function removeEventHandler( eventId, callback = false ) {
	if ( callback ) {
		getPreviewObject().unbind( eventId, callback );
		return;
	}
	const topic = getPreviewObject().topics[ eventId ];
	if ( topic ) {
		topic.empty();
	}
}

/*******************
 * Private functions
 *******************/

function getParentApi() {
	if ( thisWindow.parent.wp ) {
		return thisWindow.parent.wp.customize;
	}
	return null;
}

function changeSettingValueForApi( thisApi, settingId, value ) {
	const instance = thisApi.instance( settingId );
	if ( ! instance ) {
		return null;
	}
	instance.set( value );
	return value;
}

function getPreviewObject() {
	// wp-admin is previewer, frontend is preview. why? no idea.
	return typeof api.preview !== 'undefined' ? api.preview : api.previewer;
}

