import { Route, Routes } from "react-router-dom";

import AppLayout from "@/components/layout/AppLayout";
import EquipmentsPage from "@/pages/EquipmentsPage";
import HissatsuPage from "@/pages/HissatsuPage";
import MatchDropsPage from "@/pages/MatchDropsPage";
import PlayersPage from "@/pages/PlayersPage";
import TeamBuilderPage from "@/pages/TeamBuilderPage";

function App() {
	return (
		<Routes>
			<Route path="/" element={<AppLayout />}>
				<Route index element={<PlayersPage />} />
				<Route path="equipments" element={<EquipmentsPage />} />
				<Route path="hissatsu" element={<HissatsuPage />} />
				<Route path="team-builder" element={<TeamBuilderPage />} />
				<Route path="match-drops" element={<MatchDropsPage />} />
			</Route>
		</Routes>
	);
}

export default App;
