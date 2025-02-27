
export default function eventReducer(state, action) {
    let apps;
    switch (action.type) {
        case 'LAUNCH_APP':
            apps = state.apps?.map(app =>
                app.component === action.payload.component ?
                    { ...app, status: { ...app.status, isRunning: true } } :
                    app
            );
            return { ...state, apps };
        case 'CLOSE_APP':
            apps = state.apps?.map(app =>
                app.component === action.payload.component ?
                    { ...app, status: { ...app.status, isRunning: false } } :
                    app
            );
            return { ...state, apps };
        default:
            return state;
    }
}