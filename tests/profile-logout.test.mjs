import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const profileSource = await readFile(new URL("../src/pages/Perfil.tsx", import.meta.url), "utf8");

test("perfil permite encerrar a sessão e redireciona para login", () => {
  assert.match(profileSource, /const \{ user, roles, signOut \} = useAuth\(\)/);
  assert.match(profileSource, /const handleSignOut = async \(\) => \{\s*setIsSigningOut\(true\);\s*await signOut\(\);\s*navigate\("\/login", \{ replace: true \}\);\s*\}/);
  assert.match(profileSource, /onClick=\{handleSignOut\}[\s\S]*?\{isSigningOut \? "Saindo…" : "Sair da conta"\}/);
});
