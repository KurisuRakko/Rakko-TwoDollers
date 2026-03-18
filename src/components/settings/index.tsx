import createConfirmProvider from "../confirm";
import SettingsForm from "./form";
import { UserCenterProvider } from "./user-center";

const [SettingsDialog, showSettings] = createConfirmProvider(SettingsForm, {
    dialogTitle: "Settings",
    dialogModalClose: false,
    contentClassName:
        "h-full w-full max-h-full max-w-full rounded-none sm:rounded-md sm:max-h-[55vh] sm:w-[90vw] sm:max-w-[500px]",
});

function Settings() {
    return (
        <>
            <SettingsDialog />
            <UserCenterProvider />
        </>
    );
}

export { Settings, showSettings };
