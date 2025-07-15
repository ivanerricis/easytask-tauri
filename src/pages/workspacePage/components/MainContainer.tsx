import { CenterContainer } from "./CenterContainer"
import { SideBarLeft } from "./sidebar/SideBarLeft"
// import { SideBarRight } from "./sidebar/SideBarRight"

export const MainContainer = () => {

    return (
        <div className="flex flex-1 w-full overflow-hidden">
            <SideBarLeft />
            <CenterContainer />
            {/* <SideBarRight /> */}
        </div >
    )
}