import os
import sys
import argparse
from infra_terraform import terraform_commands

def parse_arguments():
    parser = argparse.ArgumentParser(description='infra-terraform main script')
    parser.add_argument('--action', type=str, required=True, choices=['init', 'plan', 'apply', 'destroy'], help='Terraform action to perform')
    parser.add_argument('--environment', type=str, required=True, help='Environment to target')
    return parser.parse_args()

def main():
    args = parse_arguments()
    try:
        if args.action == 'init':
            terraform_commands.init(args.environment)
        elif args.action == 'plan':
            terraform_commands.plan(args.environment)
        elif args.action == 'apply':
            terraform_commands.apply(args.environment)
        elif args.action == 'destroy':
            terraform_commands.destroy(args.environment)
    except Exception as e:
        print(f"An error occurred: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()