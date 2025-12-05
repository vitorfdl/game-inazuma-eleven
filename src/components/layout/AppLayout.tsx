import { useAtom } from "jotai";
import { Github, Languages, Moon, Shirt, Sparkles, Sun, Swords, Trophy, Users, Wind } from "lucide-react";
import { useEffect } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { ChangelogNoticeboard } from "@/components/changelog/ChangelogNoticeboard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarInset,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { playerNamePreferenceAtom } from "@/store/name-preference";
import { themePreferenceAtom } from "@/store/theme";

// Helper function to get page title based on current route
function getPageTitle(pathname: string): string {
	if (pathname === "/" || pathname.startsWith("/players")) {
		return "Players";
	}
	if (pathname.startsWith("/equipments")) {
		return "Equipments";
	}
	if (pathname.startsWith("/hissatsu")) {
		return "Hissatsu";
	}
	if (pathname.startsWith("/team-builder")) {
		return "Team Builder";
	}
	if (pathname.startsWith("/match-drops")) {
		return "Match Drops";
	}
	return "StatFrame - Inazuma Eleven VC";
}

export default function AppLayout() {
	const location = useLocation();
	const [theme, setTheme] = useAtom(themePreferenceAtom);
	const [namePreference, setNamePreference] = useAtom(playerNamePreferenceAtom);
	const isDarkMode = theme === "dark";
	const nextThemeLabel = isDarkMode ? "Light" : "Dark";
	const isRomajiEnabled = namePreference === "romaji";
	useEffect(() => {
		if (typeof document === "undefined") {
			return;
		}
		const root = document.documentElement;
		root.classList.toggle("dark", isDarkMode);
		root.dataset.theme = theme;
		root.style.setProperty("color-scheme", isDarkMode ? "dark" : "light");
		const themeColorMeta = document.querySelector('meta[name="theme-color"]');
		if (themeColorMeta) {
			themeColorMeta.setAttribute("content", isDarkMode ? "#0b1017" : "#f4f1ec");
		}
	}, [isDarkMode, theme]);
	const handleThemeToggle = () => setTheme((current) => (current === "dark" ? "light" : "dark"));
	const handleNamePreferenceToggle = () => setNamePreference((current) => (current === "romaji" ? "dub" : "romaji"));
	const faviconUrl = `${import.meta.env.BASE_URL}favicon/favicon.svg`;
	const elementsSheetUrl = `${import.meta.env.BASE_URL}assets/elements-table.jpg`;
	const playersActive = location.pathname === "/" || location.pathname.startsWith("/players");
	const equipmentsActive = location.pathname.startsWith("/equipments");
	const hissatsuActive = location.pathname.startsWith("/hissatsu");
	const matchDropsActive = location.pathname.startsWith("/match-drops");
	const teamBuilderActive = location.pathname.startsWith("/team-builder");
	return (
		<SidebarProvider>
			<Sidebar collapsible="icon">
				<SidebarHeader>
					<div className="flex items-center gap-2 px-2 py-1.5 transition-all group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:px-0">
						<div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border/50 bg-background/70 shadow-sm transition-all group-data-[collapsible=icon]:size-9 group-data-[collapsible=icon]:rounded-full group-data-[collapsible=icon]:border-transparent group-data-[collapsible=icon]:bg-transparent">
							<img src={faviconUrl} alt="StatFrame - Inazuma Eleven VC" className="size-6" />
						</div>
						<div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
							<h1 className="text-lg font-black tracking-tight text-foreground">
								<span className="text-primary drop-shadow-[3px_3px_0_rgba(0,0,0,0.8)]">Stat</span>
								<span className="text-white drop-shadow-[3px_3px_0_rgba(0,0,0,0.8)]">Frame</span>
							</h1>
							<span className="truncate text-xs italic">Inazuma Eleven Victory Road</span>
						</div>
					</div>
				</SidebarHeader>
				<SidebarContent>
					<SidebarGroup>
						<SidebarGroupLabel>Navigate</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenu>
								<SidebarMenuItem>
									<SidebarMenuButton asChild isActive={playersActive}>
										<NavLink to="/">
											<Users />
											<span>Players</span>
										</NavLink>
									</SidebarMenuButton>
								</SidebarMenuItem>
								<SidebarMenuItem>
									<SidebarMenuButton asChild isActive={equipmentsActive}>
										<NavLink to="/equipments">
											<Shirt />
											<span>Equipments</span>
										</NavLink>
									</SidebarMenuButton>
								</SidebarMenuItem>
								<SidebarMenuItem>
									<SidebarMenuButton asChild isActive={hissatsuActive}>
										<NavLink to="/hissatsu">
											<Sparkles />
											<span>Hissatsu</span>
										</NavLink>
									</SidebarMenuButton>
								</SidebarMenuItem>
								<SidebarMenuItem>
									<SidebarMenuButton asChild isActive={teamBuilderActive}>
										<NavLink to="/team-builder">
											<Swords />
											<span>Team Builder</span>
										</NavLink>
									</SidebarMenuButton>
								</SidebarMenuItem>
								<SidebarMenuItem>
									<SidebarMenuButton asChild isActive={matchDropsActive}>
										<NavLink to="/match-drops">
											<Trophy />
											<span>Match Drops</span>
										</NavLink>
									</SidebarMenuButton>
								</SidebarMenuItem>
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				</SidebarContent>
				<SidebarFooter>
					<SidebarMenu>
						<SidebarMenuItem>
							<SidebarMenuButton type="button" onClick={handleThemeToggle} aria-pressed={isDarkMode} title={`Switch to ${nextThemeLabel} theme`}>
								{isDarkMode ? <Moon /> : <Sun />}
								<span>{isDarkMode ? "Dark theme" : "Light theme"}</span>
							</SidebarMenuButton>
						</SidebarMenuItem>
						<SidebarMenuItem>
							<SidebarMenuButton asChild>
								<a href="https://github.com/vitorfdl/game-inazuma-eleven" target="_blank" rel="noopener noreferrer">
									<Github />
									<span>Contribute on GitHub</span>
								</a>
							</SidebarMenuButton>
						</SidebarMenuItem>
					</SidebarMenu>
				</SidebarFooter>
			</Sidebar>
			<SidebarInset>
				<header className="sticky top-0 z-40 flex min-h-14 flex-wrap items-center gap-2 border-b bg-background/95 px-3 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:h-15 sm:flex-nowrap sm:gap-4 sm:px-4">
					<SidebarTrigger className="-ml-1" />
					<div className="hidden h-10 w-px bg-border/70 sm:block" />
					<div className="flex min-w-0 flex-1 flex-col justify-center">
						<span className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground/80">{getPageTitle(location.pathname)}</span>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<Button
							type="button"
							variant={isRomajiEnabled ? "default" : "outline"}
							size="sm"
							className="h-10 gap-1 px-3 sm:gap-2"
							onClick={handleNamePreferenceToggle}
							aria-pressed={isRomajiEnabled}
							aria-label="Toggle Japanese romaji names"
							title={isRomajiEnabled ? "Switch to English dub names" : "Switch to JP romaji names"}
						>
							<Languages className="size-4" />
							<span className="hidden text-xs font-semibold uppercase tracking-wide sm:inline">JP Names</span>
							<span className="text-[10px] font-bold tracking-wide">{isRomajiEnabled ? "ON" : "OFF"}</span>
						</Button>
						<Dialog>
							<DialogTrigger asChild>
								<Button type="button" variant="outline" size="sm" className="h-10 gap-1 px-3 sm:gap-2" aria-label="Open elements interaction sheet">
									<Wind className="size-4" />
									<span className="hidden text-xs font-semibold uppercase tracking-wide sm:inline">Elements Sheet</span>
								</Button>
							</DialogTrigger>
							<DialogContent className="!max-w-3xl">
								<DialogHeader>
									<DialogTitle>Elements Interaction Sheet</DialogTitle>
								</DialogHeader>
								<div className="">
									<img src={elementsSheetUrl} alt="Elements interaction sheet" className="h-auto w-full rounded-md shadow-sm" />
								</div>
							</DialogContent>
						</Dialog>
						<ChangelogNoticeboard />
					</div>
				</header>
				<main className="flex-1 p-2">
					<Outlet />
				</main>
			</SidebarInset>
		</SidebarProvider>
	);
}
