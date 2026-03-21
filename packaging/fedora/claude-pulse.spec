%global uuid    claude-pulse@delfour.co
%global github  delfour-co/claude-pulse

Name:           gnome-shell-extension-claude-pulse
Version:        1.0.0
Release:        1%{?dist}
Summary:        Real-time Claude Code agent monitoring for GNOME Shell

License:        MIT
URL:            https://github.com/%{github}
Source0:        https://github.com/%{github}/archive/v%{version}/claude-pulse-%{version}.tar.gz

BuildArch:      noarch
BuildRequires:  glib2-devel

Requires:       gnome-shell >= 45
Requires:       jq

%description
Claude Pulse is a GNOME Shell extension that monitors Claude Code agents
in real-time. Shows active agent count, activity graph with smooth curves,
tool usage stats, session cost tracking, context health, desktop
notifications, and 4 visual themes.

%prep
%autosetup -n claude-pulse-%{version}

%build
glib-compile-schemas extension/schemas/

%install
mkdir -p %{buildroot}%{_datadir}/gnome-shell/extensions/%{uuid}
cp -r extension/* %{buildroot}%{_datadir}/gnome-shell/extensions/%{uuid}/

mkdir -p %{buildroot}%{_bindir}
install -m 755 hooks/claude-pulse-hook.sh %{buildroot}%{_bindir}/claude-pulse-hook.sh
install -m 755 hooks/compute-cost.sh %{buildroot}%{_bindir}/claude-pulse-compute-cost.sh

%files
%license LICENSE
%doc README.md CHANGELOG.md
%{_datadir}/gnome-shell/extensions/%{uuid}/
%{_bindir}/claude-pulse-hook.sh
%{_bindir}/claude-pulse-compute-cost.sh

%changelog
* Sun Mar 16 2026 Delfour.co <contact@delfour.co> - 1.0.0-1
- Initial release
- Panel indicator, activity graph, tools graph, 4 themes
- 13 hook events, cost tracking, context health
- Auto-DND, sound alerts, Super+P shortcut
- Multi-profile, profile badges, custom SVG icons
