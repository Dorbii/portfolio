
export default function eventReducer(state, action) {
    switch (action.type) {
        case 'LAUNCH_APP':
            const apps = state.apps?.map(app =>
                app.data.name === action.payload.data.name ?
                    { ...app, status: { ...app.status, isRunning: true } } :
                    app
            );
            return { ...state, apps };
        default:
            return state;
    }
}