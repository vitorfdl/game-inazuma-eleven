import {
	Github,
	Languages,
	Moon,
	Shirt,
	Sparkles,
	Sun,
	Swords,
	Users,
	Wind,
} from "lucide-react";
import { useAtom } from "jotai";
import { useEffect } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { ChangelogNoticeboard } from "@/components/changelog/ChangelogNoticeboard";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
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
import { Skeleton } from "@/components/ui/skeleton";
import { themePreferenceAtom } from "@/store/theme";
import { playerNamePreferenceAtom } from "@/store/name-preference";

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
	return "Inazuma Eleven Guide";
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
			themeColorMeta.setAttribute(
				"content",
				isDarkMode ? "#0b1017" : "#f4f1ec",
			);
		}
	}, [isDarkMode, theme]);
	const handleThemeToggle = () =>
		setTheme((current) => (current === "dark" ? "light" : "dark"));
	const handleNamePreferenceToggle = () =>
		setNamePreference((current) => (current === "romaji" ? "dub" : "romaji"));
	const faviconUrl = `${import.meta.env.BASE_URL}favicon/favicon.svg`;
	const elementsSheetUrl = `${import.meta.env.BASE_URL}assets/elements-table.jpg`;
	const playersActive =
		location.pathname === "/" || location.pathname.startsWith("/players");
	const equipmentsActive = location.pathname.startsWith("/equipments");
	const hissatsuActive = location.pathname.startsWith("/hissatsu");
	const teamBuilderActive = location.pathname.startsWith("/team-builder");
	return (
		<SidebarProvider>
			<Sidebar collapsible="icon">
				<SidebarHeader>
					<div className="flex items-center gap-2 px-2 py-1.5">
						<div className="flex aspect-square size-7 items-center justify-center">
							<img
								src={faviconUrl}
								alt="Inazuma Eleven Guide"
								className="size-7"
							/>
						</div>
						<div className="grid flex-1 text-left text-sm leading-tight">
							<span className="truncate font-semibold">
								Inazuma Eleven Guide
							</span>
							<span className="truncate text-xs">Reference Sheets</span>
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
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				</SidebarContent>
				<SidebarFooter>
					<SidebarMenu>
						<SidebarMenuItem>
							<SidebarMenuButton
								type="button"
								onClick={handleThemeToggle}
								aria-pressed={isDarkMode}
								title={`Switch to ${nextThemeLabel} theme`}
							>
								{isDarkMode ? <Moon /> : <Sun />}
								<span>{isDarkMode ? "Dark theme" : "Light theme"}</span>
							</SidebarMenuButton>
						</SidebarMenuItem>
						<SidebarMenuItem>
							<SidebarMenuButton asChild>
								<a
									href="https://github.com/vitorfdl/game-inazuma-eleven"
									target="_blank"
									rel="noopener noreferrer"
								>
									<Github />
									<span>Contribute on GitHub</span>
								</a>
							</SidebarMenuButton>
						</SidebarMenuItem>
					</SidebarMenu>
				</SidebarFooter>
			</Sidebar>
			<SidebarInset>
				<header className="sticky top-0 z-40 flex h-15 shrink-0 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
					<SidebarTrigger className="-ml-1" />
					<div className="h-10 w-px bg-border/70" />
					<div className="flex flex-1 flex-col justify-center">
						<span className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground/80">
							{getPageTitle(location.pathname)}
						</span>
					</div>
					<div className="flex items-center gap-2">
						<Skeleton className="hidden h-11 w-full max-w-xl rounded-full lg:block" />
						<Button
							type="button"
							variant={isRomajiEnabled ? "default" : "outline"}
							size="sm"
							className="h-10 gap-2 px-3"
							onClick={handleNamePreferenceToggle}
							aria-pressed={isRomajiEnabled}
							title={
								isRomajiEnabled
									? "Switch to English dub names"
									: "Switch to JP romaji names"
							}
						>
							<Languages className="size-4" />
							<span className="text-xs font-semibold uppercase tracking-wide">
								JP Names
							</span>
							<span className="text-[10px] font-bold tracking-wide">
								{isRomajiEnabled ? "ON" : "OFF"}
							</span>
						</Button>
						<Dialog>
							<DialogTrigger asChild>
								<Button
									type="button"
									variant="outline"
									size="sm"
									className="h-10 gap-2 px-3"
								>
									<Wind className="size-4" />
									<span className="text-xs font-semibold uppercase tracking-wide">
										Elements Sheet
									</span>
								</Button>
							</DialogTrigger>
							<DialogContent className="!max-w-3xl">
								<DialogHeader>
									<DialogTitle>Elements Interaction Sheet</DialogTitle>
								</DialogHeader>
								<div className="">
									<img
										src={elementsSheetUrl}
										alt="Elements interaction sheet"
										className="h-auto w-full rounded-md shadow-sm"
									/>
								</div>
							</DialogContent>
						</Dialog>
						<ChangelogNoticeboard />
					</div>
				</header>
				<main className="flex-1 p-4">
					<Outlet />
				</main>
			</SidebarInset>
		</SidebarProvider>
	);
}
