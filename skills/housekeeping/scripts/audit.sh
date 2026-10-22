#!/usr/bin/env bash
# Housekeeping audit. Prints one tab-separated table per section, each headed
# "# <section>", with a suggested bucket where the section has one. It fetches
# the base ref but never deletes anything; the housekeeping skill owns removal.
#
# Usage: audit.sh [section...] [-b|--base <ref>] [-t|--transcripts <dir>] [repo-path]
#   Sections: --worktrees --branches --stashes --prs --scratch --processes --disk.
#   None means all. repo-path defaults to the current repo; --disk alone needs none.
#   -t adds a directory of chat transcripts (JSONL) to scan for LAST_CHAT, and
#   may repeat. It overrides $GSTACK_TRANSCRIPTS_DIR. With neither, LAST_CHAT is "-".
#   -b sets the ref the MERGED column checks against (e.g. origin/integration).
#   Without it the base is origin/HEAD, then origin/main, then origin/master.
#   origin/HEAD is the remote's default branch, not necessarily the branch PRs
#   merge into; pass -b when they differ.
#   PR columns need gh and cover only your own PRs (gh pr list --author @me).
#
# Buckets:
#   worktrees  hold-wip (tracked edits), hold-open-pr, hold-ignored (IGNORED lists
#              ignored paths outside the rebuildable ones), verify-recent-chat (a
#              chat touched it in the last 4 days), safe (merged, or has a PR),
#              review.
#   branches   local rows: hold-worktree, hold-open-pr, safe (MERGED is pr: a
#              merged PR's head contains the tip), review (upstream gone or a
#              PR, but MERGED is not pr), keep. MERGED is base when the tip is in
#              the base, which also holds for a branch with no commits of its
#              own, so it never makes a branch safe. origin rows: merged-PR heads still on origin, bucket report.
#   prs        open PRs flagged head-gone (branch not on origin) or stale-draft
#              (draft not updated in 14 days).
#   Other sections have no bucket; they are report only. processes lists every
#   process whose cwd is in a linked worktree, and main-worktree processes only
#   when they hold a port or are orphans (ORPHAN is yes).
set -u

rebuildable='^(node_modules|dist|build|\.next|\.turbo|coverage|\.cache|__pycache__)$'
all="worktrees branches stashes prs scratch processes disk"
sections=""
base=""
transcripts=""
stale_days=14
while [ $# -gt 0 ]; do
	case "$1" in
	--worktrees|--branches|--stashes|--prs|--scratch|--processes|--disk) sections="$sections ${1#--}"; shift ;;
	-b|--base) [ $# -ge 2 ] || { echo "error: $1 needs a ref" >&2; exit 2; }; base="$2"; shift 2 ;;
	-t|--transcripts) [ $# -ge 2 ] || { echo "error: $1 needs a dir" >&2; exit 2; }; transcripts="$transcripts$2"$'\n'; shift 2 ;;
	-h|--help) sed -n '2,/^set -u/p' "$0" | sed '$d; s/^# \{0,1\}//'; exit 0 ;;
	-*) echo "error: unknown option: $1" >&2; exit 2 ;;
	*) break ;;
	esac
done
[ $# -le 1 ] || { echo "error: unexpected argument: $2 (options go before repo-path)" >&2; exit 2; }
[ -z "$sections" ] && sections="$all"
[ -z "$transcripts" ] && [ -n "${GSTACK_TRANSCRIPTS_DIR:-}" ] && transcripts="$GSTACK_TRANSCRIPTS_DIR"$'\n'
wants() { for s in "$@"; do case " $sections " in *" $s "*) return 0 ;; esac; done; return 1; }

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
now=$(date +%s)
field=$'\x1f'

if wants worktrees branches stashes prs scratch processes; then
	repo="${1:-$(git rev-parse --show-toplevel 2>/dev/null)}"
	[ -z "$repo" ] && { echo "not in a git repo; pass a repo path" >&2; exit 1; }
	cd "$repo" || exit 1
	git rev-parse --git-dir >/dev/null 2>&1 || { echo "error: not a git repo: $repo" >&2; exit 1; }

	git worktree list --porcelain | awk '/^worktree /{print substr($0, 10)}' > "$tmp/worktrees"
	main_wt=$(head -1 "$tmp/worktrees")
	git worktree list --porcelain | awk '/^worktree /{wt=substr($0, 10)} /^branch refs\/heads\//{print substr($0, 19) "\t" wt}' > "$tmp/wt_branches"
fi

if wants worktrees branches; then
	if [ -z "$base" ]; then
		for cand in "$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null)" origin/main origin/master; do
			[ -n "$cand" ] && git rev-parse --verify --quiet "$cand^{commit}" >/dev/null && { base="$cand"; break; }
		done
		[ -z "$base" ] && { echo "error: no base ref (origin/HEAD, origin/main, origin/master all missing); pass -b <ref>" >&2; exit 1; }
		echo "warn: no -b given; MERGED checks against $base" >&2
	fi

	# The explicit refspec creates the tracking ref even in a single-branch clone,
	# whose configured refspec would skip it.
	case "$base" in
	origin/*) git fetch origin "+refs/heads/${base#origin/}:refs/remotes/$base" --quiet 2>/dev/null \
		|| echo "warn: could not fetch $base; merged column may be stale" >&2 ;;
	esac
	git rev-parse --verify --quiet "$base^{commit}" >/dev/null 2>&1 || { echo "error: base ref not found: $base" >&2; exit 1; }
	base_branch="${base#*/}"
	default_branch=$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null)
	default_branch="${default_branch#origin/}"
	echo "# base: $base"
fi

prs="$tmp/prs"
if wants worktrees branches prs; then
	gh pr list --author "@me" --state all --limit 1000 \
		--json number,state,headRefName,headRefOid,isDraft,isCrossRepository,updatedAt,title,baseRefName \
		--jq 'sort_by(.number) | reverse | .[] | [.number, (.state | ascii_downcase), .headRefName, .headRefOid, .isDraft, .isCrossRepository, (.updatedAt | fromdateiso8601), .title, .baseRefName] | @tsv' \
		> "$prs" 2>/dev/null || { echo "warn: gh could not list PRs; PR columns will be -" >&2; : > "$prs"; }
fi
pr_for() { awk -F'\t' -v b="$1" '$3==b {print "#" $1 "/" $2; exit}' "$prs"; }

# Branch heads on origin, read with ls-remote so stale remote-tracking refs
# never make a deleted branch look alive.
heads="$tmp/heads"
heads_ok=""
: > "$heads"
if wants branches prs scratch; then
	if listing=$(git ls-remote --heads origin 2>/dev/null); then
		printf '%s\n' "$listing" | awk -F'\t' '$2 ~ /^refs\/heads\// {print $1 "\t" substr($2, 12)}' > "$heads"
		heads_ok=yes
	else echo "warn: could not list origin heads; UPSTREAM uses local tracking refs, and no head-gone or origin rows" >&2; fi
fi
on_origin() { awk -F'\t' -v b="$1" '$2==b {f=1} END {exit !f}' "$heads"; }

if wants branches scratch; then
	git for-each-ref refs/heads \
		--format="%(refname:lstrip=2)%1f%(objectname)%1f%(committerdate:unix)%1f%(upstream:short)%1f%(upstream:track)%1f%(contents:subject)" \
		> "$tmp/branches"
fi
worktree_of() { awk -F'\t' -v b="$1" '$1==b {print $2; exit}' "$tmp/wt_branches"; }
upstream_state() {
	if [ -z "$1" ]; then echo none
	elif [ "$2" = "[gone]" ]; then echo gone
	elif [ -n "$heads_ok" ] && [ "${1#origin/}" != "$1" ] && ! on_origin "${1#origin/}"; then echo gone
	else echo tracking; fi
}
mtime() { stat -c %Y "$1" 2>/dev/null || stat -f %m "$1"; }

section_worktrees() {
	[ -z "$transcripts" ] && echo "warn: no transcripts dir (-t or GSTACK_TRANSCRIPTS_DIR); LAST_CHAT will be -" >&2
	printf '%s' "$transcripts" | while IFS= read -r d; do
		[ -d "$d" ] || echo "warn: transcripts dir not found: $d; LAST_CHAT skips it" >&2
	done

	echo "# worktrees"
	printf "SIZE\tAGE\tMERGED\tDIRTY\tIGNORED\tREMOTE\tPR\tLAST_CHAT\tBUCKET\tWORKTREE\n"
	while IFS= read -r wt; do
		[ "$wt" = "$main_wt" ] && continue

		size=$(du -sh "$wt" 2>/dev/null | awk '{print $1}')
		head=$(git -C "$wt" rev-parse HEAD 2>/dev/null)
		head_ts=$(git -C "$wt" log -1 --format='%ct' HEAD 2>/dev/null || echo 0)
		age=$([ "$head_ts" -gt 0 ] 2>/dev/null && echo "$(( (now - head_ts) / 86400 ))d" || echo "?")

		git merge-base --is-ancestor "$head" "$base" 2>/dev/null && merged=YES || merged=no

		porcelain=$(git -C "$wt" status --porcelain 2>/dev/null)
		if [ -z "$porcelain" ]; then dirty=clean
		elif printf '%s\n' "$porcelain" | grep -qv '^??'; then
			dirty="wip:$(printf '%s\n' "$porcelain" | grep -cv '^??')"
		else dirty="scratch:$(printf '%s\n' "$porcelain" | grep -c '^??')"; fi

		ignored=$(git -C "$wt" status --porcelain --ignored 2>/dev/null \
			| awk -v re="$rebuildable" '/^!! /{p=substr($0, 4); sub(/\/$/, "", p); n=p; sub(/.*\//, "", n); if (n !~ re) print p}' | paste -sd, -)
		[ -z "$ignored" ] && ignored="-"

		branch=$(git -C "$wt" symbolic-ref --quiet --short HEAD 2>/dev/null || echo "")
		if [ -z "$branch" ]; then remote=detached
		elif git -C "$wt" show-ref --verify --quiet "refs/remotes/origin/$branch"; then
			[ "$(git -C "$wt" rev-parse "origin/$branch" 2>/dev/null)" = "$head" ] \
				&& remote=pushed \
				|| remote="ahead$(git -C "$wt" rev-list --count "origin/$branch..HEAD" 2>/dev/null)"
		else remote=no-remote; fi

		pr=$([ -n "$branch" ] && pr_for "$branch")
		[ -z "$pr" ] && pr="-"

		# A path counts only when "/" or a quote follows it, so wt-1 never matches wt-12.
		last="-"; last_ts=0
		f=$(printf '%s' "$transcripts" | while IFS= read -r d; do
				[ -d "$d" ] && grep -rlF -e "${wt}/" -e "${wt}\"" "$d" 2>/dev/null
			done | while IFS= read -r t; do echo "$(mtime "$t") $t"; done | sort -rn | head -1)
		if [ -n "$f" ]; then last_ts=$(echo "$f" | awk '{print $1}')
			last=$(date -r "$last_ts" '+%Y-%m-%d' 2>/dev/null || date -d "@$last_ts" '+%Y-%m-%d'); fi
		recent=$([ "$last_ts" -gt 0 ] 2>/dev/null && [ $(( (now - last_ts) / 86400 )) -le 4 ] && echo yes || echo no)

		case "$dirty" in wip:*) bucket=hold-wip ;; *)
			case "$pr" in */open) bucket=hold-open-pr ;; *)
				if [ "$ignored" != "-" ]; then bucket=hold-ignored
				elif [ "$recent" = yes ]; then bucket=verify-recent-chat
				elif [ "$merged" = YES ] || [ "$pr" != "-" ]; then bucket=safe
				else bucket=review; fi ;;
			esac ;;
		esac

		printf "%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n" \
			"$size" "$age" "$merged" "$dirty" "$ignored" "$remote" "$pr" "$last" "$bucket" "$wt"
	done < "$tmp/worktrees" | sort -t$'\t' -k1,1 -rh
}

tip_in_merged_pr() {
	local branch=$1 tip=$2
	awk -F'\t' -v b="$branch" '$3==b && $2=="merged" {print $4}' "$prs" | {
		while read -r oid; do
			[ "$oid" = "$tip" ] && exit 0
			git merge-base --is-ancestor "$tip" "$oid" 2>/dev/null && exit 0
		done
		exit 1
	}
}

merged_pr_heads_on_origin() {
	awk -F'\t' -v now="$now" -v base="$base_branch" -v dflt="$default_branch" '
		FILENAME==ARGV[1] { remote[$2]=$1; next }
		$2=="open" { open[$3]=1; open[$9]=1; next }
		$2=="merged" && $6=="false" && ($3 in remote) && $3!=base && $3!=dflt && !seen[$3]++ {
			row[$3]=sprintf("origin\t%dd\t%s\t-\t#%s/merged\t-\treport\t%s", (now-$7)/86400, (remote[$3]==$4 ? "pr" : "no"), $1, $3)
		}
		END { for (h in row) if (!(h in open)) print row[h] }' "$heads" "$prs"
}

section_branches() {
	echo "# branches"
	printf "WHERE\tAGE\tMERGED\tUPSTREAM\tPR\tWORKTREE\tBUCKET\tBRANCH\n"
	{
		while IFS="$field" read -r name sha ts up track _; do
			[ "$name" = "$base_branch" ] || [ "$name" = "$default_branch" ] && continue
			if tip_in_merged_pr "$name" "$sha"; then merged=pr
			elif git merge-base --is-ancestor "$sha" "$base" 2>/dev/null; then merged=base
			else merged=no; fi
			upstream=$(upstream_state "$up" "$track")
			pr=$(pr_for "$name"); [ -z "$pr" ] && pr="-"
			wt=$(worktree_of "$name"); [ -z "$wt" ] && wt="-"
			if [ "$wt" != "-" ]; then bucket=hold-worktree
			else case "$pr" in
				*/open) bucket=hold-open-pr ;;
				*) if [ "$merged" = pr ]; then bucket=safe
				   elif [ "$upstream" = gone ] || [ "$pr" != "-" ]; then bucket=review
				   else bucket=keep; fi ;;
			esac; fi
			printf "local\t%sd\t%s\t%s\t%s\t%s\t%s\t%s\n" "$(( (now - ts) / 86400 ))" "$merged" "$upstream" "$pr" "$wt" "$bucket" "$name"
		done < "$tmp/branches"
		merged_pr_heads_on_origin
	} | sort -t$'\t' -k7,7 -k8,8
}

section_stashes() {
	echo "# stashes"
	printf "STASH\tAGE\tBRANCH\tBRANCH_EXISTS\tSUBJECT\n"
	git stash list --format="%gd%x09%ct%x09%gs" | while IFS=$'\t' read -r ref ts subject; do
		branch=$(printf '%s' "$subject" | sed -n 's/^WIP on \([^:]*\):.*/\1/p; s/^On \([^:]*\):.*/\1/p')
		git show-ref --verify --quiet "refs/heads/$branch" && exists=yes || exists=no
		printf "%s\t%sd\t%s\t%s\t%s\n" "$ref" "$(( (now - ts) / 86400 ))" "${branch:--}" "$exists" "$subject"
	done
}

section_prs() {
	echo "# prs"
	printf "PR\tSTATE\tAGE\tHEAD\tFLAG\tTITLE\n"
	awk -F'\t' -v now="$now" -v stale="$stale_days" -v known="$heads_ok" '
		FILENAME==ARGV[1] { remote[$2]=1; next }
		$2=="open" {
			age = int((now - $7) / 86400); flag = ""
			if (known && $6=="false" && !($3 in remote)) flag = "head-gone"
			if ($5=="true" && age > stale) flag = flag (flag ? "," : "") "stale-draft"
			if (flag) printf "#%s\t%s\t%dd\t%s\t%s\t%s\n", $1, ($5=="true" ? "draft" : "open"), age, $3, flag, $8
		}' "$heads" "$prs"
}

section_scratch() {
	echo "# scratch"
	printf "KIND\tAGE\tITEM\tDETAIL\n"
	for f in /tmp/*-resume.md; do
		[ -e "$f" ] || continue
		printf "resume-note\t%sd\t%s\t%s\n" "$(( (now - $(mtime "$f")) / 86400 ))" "$f" "$(du -h "$f" | awk '{print $1}')"
	done
	while IFS="$field" read -r name _ ts up track subject; do
		case "$subject" in [Ww][Ii][Pp]|[Ww][Ii][Pp][:\ \(!]*) ;; *) continue ;; esac
		[ -n "$(worktree_of "$name")" ] && continue
		upstream=$(upstream_state "$up" "$track")
		[ "$upstream" = tracking ] && continue
		printf "wip-commit\t%sd\t%s\tupstream:%s %s\n" "$(( (now - ts) / 86400 ))" "$name" "$upstream" "$subject"
	done < "$tmp/branches"
}

pid_worktrees() {
	lsof -a -u "$(id -un)" -d cwd -Fpn 2>/dev/null \
		| awk '/^p/{pid=substr($0,2)} /^n/{print pid "\t" substr($0,2)}' \
		| awk -F'\t' 'FILENAME==ARGV[1] { wts[$0]=1; next }
			{ deepest=""; for (w in wts) if (($2==w || index($2, w "/")==1) && length(w) > length(deepest)) deepest=w
			  if (deepest != "") print $1 "\t" deepest }' "$tmp/worktrees" -
}

section_processes() {
	echo "# processes"
	printf "PID\tPPID\tORPHAN\tPORTS\tELAPSED\tWORKTREE\tCOMMAND\n"
	command -v lsof >/dev/null || { echo "warn: lsof not found; processes section is empty" >&2; return; }
	lsof -nP -a -u "$(id -un)" -iTCP -sTCP:LISTEN -Fpn 2>/dev/null \
		| awk '/^p/{pid=substr($0,2)} /^n/{n=split($0, a, ":"); print pid "\t" a[n]}' > "$tmp/ports"
	pid_worktrees | while IFS=$'\t' read -r pid wt; do
		ports=$(awk -F'\t' -v p="$pid" '$1==p {print $2}' "$tmp/ports" | sort -un | paste -sd, -)
		read -r ppid etime cmd <<< "$(ps -o ppid=,etime=,command= -p "$pid" 2>/dev/null)"
		[ -z "$ppid" ] || [ "$pid" = "$$" ] || [ "$ppid" = "$$" ] && continue
		[ "$wt" = "$main_wt" ] && [ -z "$ports" ] && [ "$ppid" != 1 ] && continue
		printf "%s\t%s\t%s\t%s\t%s\t%s\t%.120s\n" "$pid" "$ppid" "$([ "$ppid" = 1 ] && echo yes || echo no)" "${ports:--}" "$etime" "$wt" "$cmd"
	done
}

disk_row() {
	[ -n "$3" ] && [ -d "$3" ] || return 0
	printf "%s\t%s\t%s\t%s\n" "$(du -sh "$3" 2>/dev/null | awk '{print $1}')" "$1" "$2" "$3"
}

section_disk() {
	echo "# disk"
	df -h / | awk 'NR==2 {print "# free: " $4 " of " $2 " on /"}'
	printf "SIZE\tKIND\tITEM\tPATH\n"
	# COREPACK_ENABLE_NETWORK=0 stops a corepack shim downloading a package
	# manager just to answer where its cache is.
	{
		disk_row cache pnpm "$(command -v pnpm >/dev/null && COREPACK_ENABLE_NETWORK=0 pnpm store path 2>/dev/null)"
		disk_row cache yarn "$(command -v yarn >/dev/null && COREPACK_ENABLE_NETWORK=0 yarn cache dir 2>/dev/null)"
		disk_row cache npm "$HOME/.npm/_cacache"
		disk_row cache brew "$(command -v brew >/dev/null && brew --cache 2>/dev/null)"
		disk_row cache uv "$(command -v uv >/dev/null && uv cache dir 2>/dev/null)"
		disk_row xcode DerivedData "$HOME/Library/Developer/Xcode/DerivedData"
		disk_row xcode "iOS DeviceSupport" "$HOME/Library/Developer/Xcode/iOS DeviceSupport"
		disk_row simulator devices "$HOME/Library/Developer/CoreSimulator/Devices"
		disk_row simulator test-clones "$HOME/Library/Developer/XCTestDevices"
	} | sort -t$'\t' -k1,1 -rh
}

first=1
for s in $all; do
	wants "$s" || continue
	[ "$first" = 1 ] || echo
	first=0
	"section_$s"
done
