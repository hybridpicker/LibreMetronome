#!/bin/bash
# Quick test runner for LibreMetronome

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🧪 LibreMetronome Quick Test Runner"
echo "===================================="

# Function to run Django tests
run_django_tests() {
    echo -e "\n${YELLOW}Running Django Tests...${NC}"
    cd backend
    
    if [ -d "../venv" ]; then
        source ../venv/bin/activate
    elif [ -d "venv" ]; then
        source venv/bin/activate
    fi
    
    # Quick check
    python manage.py check --deploy 2>/dev/null || python manage.py check
    
    # Run tests
    python manage.py test -v 2
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Django tests passed${NC}"
    else
        echo -e "${RED}✗ Django tests failed${NC}"
        exit 1
    fi
    
    cd ..
}

# Function to run React tests
run_react_tests() {
    echo -e "\n${YELLOW}Running React Tests...${NC}"
    cd frontend
    
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}Node modules not found. Run 'npm install' first.${NC}"
        cd ..
        return
    fi
    
    # Run tests
    CI=true npm test -- --passWithNoTests --watchAll=false
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ React tests passed${NC}"
    else
        echo -e "${RED}✗ React tests failed${NC}"
        exit 1
    fi
    
    cd ..
}

# Main execution
case "$1" in
    django)
        run_django_tests
        ;;
    react)
        run_react_tests
        ;;
    all|"")
        run_django_tests
        run_react_tests
        ;;
    *)
        echo "Usage: $0 [django|react|all]"
        echo "  django - Run only Django tests"
        echo "  react  - Run only React tests"
        echo "  all    - Run all tests (default)"
        exit 1
        ;;
esac

echo -e "\n${GREEN}✅ All tests completed!${NC}"
