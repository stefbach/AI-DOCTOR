#!/bin/bash

# Script de nettoyage du projet avant migration OVH HDS
# Généré à partir de l'analyse knip

set -e  # Arrêter en cas d'erreur

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🧹 Script de nettoyage du projet${NC}"
echo "=================================="

# 1. BACKUP ET VERIFICATION
echo -e "\n${YELLOW}📁 Étape 1: Backup et vérification${NC}"

# Vérifier qu'on est dans un repo git
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}❌ Erreur: Ce n'est pas un dépôt git!${NC}"
    exit 1
fi

# Créer une branche de sauvegarde
BACKUP_BRANCH="backup-before-cleanup-$(date +%Y%m%d-%H%M%S)"
echo "Création de la branche de backup: $BACKUP_BRANCH"
git checkout -b "$BACKUP_BRANCH"
git add -A
git commit -m "Backup complet avant nettoyage" || echo "Rien à commiter"

# Créer une nouvelle branche pour le nettoyage
git checkout -b cleanup-pre-migration

# 2. SUPPRESSION DES FICHIERS NON UTILISES
echo -e "\n${YELLOW}📄 Étape 2: Suppression des fichiers non utilisés${NC}"

# Liste complète des fichiers à supprimer (depuis knip)
FILES_TO_DELETE=(
    "app/components/medical/MauritianDocumentEditor.tsx"
    "components/CompleteMauritianDocumentEditor.tsx"
    "components/consultation-report.tsx"
    "components/integrated-medical-consultation.tsx"
    "components/medical-documents/biology-prescription.tsx"
    "components/medical-documents/consultation-report.tsx"
    "components/medical-documents/imaging-prescription.tsx"
    "components/medical-documents/medication-prescription.tsx"
    "components/medical-workflow-manager.tsx"
    "components/medical/documents-workflow.tsx"
    "components/medical/editors/biology-editor.tsx"
    "components/medical/editors/consultation-editor.tsx"
    "components/medical/editors/medication-editor.tsx"
    "components/medical/editors/paraclinical-editor.tsx"
    "components/medical/main-medical-workflow.tsx"
    "components/medication-prescription.tsx"
    "components/paraclinical-exams.tsx"
    "components/professional-report-editable.tsx"
    "components/system-check.tsx"
    "components/test-cases.tsx"
    "components/ui/accordion.tsx"
    "components/ui/alert-dialog.tsx"
    "components/ui/aspect-ratio.tsx"
    "components/ui/avatar.tsx"
    "components/ui/breadcrumb.tsx"
    "components/ui/calendar.tsx"
    "components/ui/carousel.tsx"
    "components/ui/chart.tsx"
    "components/ui/collapsible.tsx"
    "components/ui/command.tsx"
    "components/ui/context-menu.tsx"
    "components/ui/dialog.tsx"
    "components/ui/drawer.tsx"
    "components/ui/dropdown-menu.tsx"
    "components/ui/form.tsx"
    "components/ui/hover-card.tsx"
    "components/ui/input-otp.tsx"
    "components/ui/menubar.tsx"
    "components/ui/navigation-menu.tsx"
    "components/ui/pagination.tsx"
    "components/ui/popover.tsx"
    "components/ui/resizable.tsx"
    "components/ui/scroll-area.tsx"
    "components/ui/separator.tsx"
    "components/ui/sheet.tsx"
    "components/ui/sidebar.tsx"
    "components/ui/skeleton.tsx"
    "components/ui/slider.tsx"
    "components/ui/sonner.tsx"
    "components/ui/table.tsx"
    "components/ui/toggle-group.tsx"
    "components/ui/toggle.tsx"
    "components/ui/tooltip.tsx"
    "components/ui/use-mobile.tsx"
    "contexts/language-context.tsx"
    "hooks/use-mobile.tsx"
    "hooks/use-tibok-doctor-data.ts"
    "lib/api-services.ts"
    "lib/generate-report-helper.ts"
)

# Compteur de fichiers supprimés
deleted_count=0

for file in "${FILES_TO_DELETE[@]}"; do
    if [ -f "$file" ]; then
        echo -e "  ${RED}✗${NC} Suppression: $file"
        rm "$file"
        ((deleted_count++))
    else
        echo -e "  ${YELLOW}⚠${NC}  Déjà absent: $file"
    fi
done

echo -e "${GREEN}✓ $deleted_count fichiers supprimés${NC}"

# 3. SUPPRESSION DES DOSSIERS VIDES
echo -e "\n${YELLOW}📁 Étape 3: Suppression des dossiers vides${NC}"
find . -type d -empty -not -path "./.git/*" -not -path "./node_modules/*" -delete
echo -e "${GREEN}✓ Dossiers vides supprimés${NC}"

# 4. DESINSTALLATION DES PACKAGES NON UTILISES
echo -e "\n${YELLOW}📦 Étape 4: Désinstallation des packages non utilisés${NC}"

# Liste des packages à désinstaller
PACKAGES_TO_REMOVE=(
    "@hookform/resolvers"
    "@radix-ui/react-accordion"
    "@radix-ui/react-alert-dialog"
    "@radix-ui/react-aspect-ratio"
    "@radix-ui/react-avatar"
    "@radix-ui/react-collapsible"
    "@radix-ui/react-context-menu"
    "@radix-ui/react-dialog"
    "@radix-ui/react-dropdown-menu"
    "@radix-ui/react-hover-card"
    "@radix-ui/react-menubar"
    "@radix-ui/react-navigation-menu"
    "@radix-ui/react-popover"
    "@radix-ui/react-scroll-area"
    "@radix-ui/react-separator"
    "@radix-ui/react-slider"
    "@radix-ui/react-toggle"
    "@radix-ui/react-toggle-group"
    "@radix-ui/react-tooltip"
    "@sentry/nextjs"
    "autoprefixer"
    "cmdk"
    "date-fns"
    "embla-carousel-react"
    "input-otp"
    "limiter"
    "lru-cache"
    "openai"
    "react-day-picker"
    "react-hook-form"
    "react-resizable-panels"
    "recharts"
    "sonner"
    "vaul"
    "prettier"
)

echo "Désinstallation des packages..."
npm uninstall ${PACKAGES_TO_REMOVE[@]}

# 5. NETTOYAGE FINAL
echo -e "\n${YELLOW}🧹 Étape 5: Nettoyage final${NC}"

# Nettoyer les packages orphelins
npm prune

# Régénérer le package-lock.json
rm -f package-lock.json
npm install

# 6. VERIFICATION DU BUILD
echo -e "\n${YELLOW}🔨 Étape 6: Vérification du build${NC}"

# Tenter de build
if npm run build; then
    echo -e "${GREEN}✓ Build réussi!${NC}"
else
    echo -e "${RED}❌ Erreur lors du build!${NC}"
    echo -e "${YELLOW}Vous pouvez revenir en arrière avec:${NC}"
    echo "git checkout $BACKUP_BRANCH"
    exit 1
fi

# 7. RAPPORT FINAL
echo -e "\n${GREEN}📊 RAPPORT DE NETTOYAGE${NC}"
echo "=================================="
echo -e "Branch de backup: ${YELLOW}$BACKUP_BRANCH${NC}"
echo -e "Fichiers supprimés: ${YELLOW}$deleted_count${NC}"
echo -e "Packages supprimés: ${YELLOW}${#PACKAGES_TO_REMOVE[@]}${NC}"

# Afficher la réduction de taille
if [ -d "node_modules" ]; then
    echo -e "\nTaille node_modules: ${YELLOW}$(du -sh node_modules | cut -f1)${NC}"
fi

# 8. COMMIT DES CHANGEMENTS
echo -e "\n${YELLOW}💾 Commit des changements${NC}"
git add -A
git commit -m "Nettoyage: suppression du code et dépendances non utilisés

- Suppression de $deleted_count fichiers non utilisés
- Suppression de ${#PACKAGES_TO_REMOVE[@]} packages npm non utilisés
- Basé sur l'analyse knip"

echo -e "\n${GREEN}✨ Nettoyage terminé avec succès!${NC}"
echo -e "\nPour tester l'application:"
echo -e "  ${YELLOW}npm run dev${NC}"
echo -e "\nPour revenir en arrière si besoin:"
echo -e "  ${YELLOW}git checkout $BACKUP_BRANCH${NC}"
echo -e "\nPour pousser les changements:"
echo -e "  ${YELLOW}git push origin cleanup-pre-migration${NC}"
