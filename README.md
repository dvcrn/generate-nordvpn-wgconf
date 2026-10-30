# NordVPN WireGuard Configuration Generator

This tool automates the generation of WireGuard configuration files for NordVPN servers. It allows users to generate configurations for specific countries or all available countries, leveraging NordVPN's recommended servers.

## Getting Started

### Installation

```
npx generate-nordvpn-wgconf
```

or

```
npm install -g generate-nordvpn-wgconf
```

There are 3 ways to use this:

#### Automated keychain extraction (macOS)

1. Install NordVPN **from the Mac AppStore**, not directly from the website or brew
2. Go into settings and change protocol to NordLynx
3. Connect to any server with NordLynx, doesn't matter which

After doing that, NordVPN will store the NordLynx (WireGuard) credentials in keychain, for us to extract.

Then

```
npx generate-nordvpn-wgconf --outdir . --country TH,JP --amount 2
```

If multiple NordVPN accounts are found in keychain, pick one with `--nordvpn-accountid` (the tool lists the IDs it found)

```
npx generate-nordvpn-wgconf --nordvpn-accountid yyy --outdir . --country TH,JP --amount 2
```

#### Automated private key extraction through NordVPN API

1. Go to https://my.nordaccount.com/dashboard/nordvpn/access-tokens/
2. Click "Generate Access Token" and write it down

Then

```
npx generate-nordvpn-wgconf --token yyy --outdir . --country TH,JP --amount 2
```

You can also use `NORDVPN_TOKEN`

#### Manual specifying of private key

If `--pk` is specified, it will just use that and no macOS specific functionality is used

```
npx generate-nordvpn-wgconf --pk yyy --outdir . --country TH,JP --amount 2
```

### Usage

```
❯ npx generate-nordvpn-wgconf --outdir . --country JP --amount 3
no --pk, --token or --id specified, searching keychain for NordVPN account
extracting private key from keychain for account XXXXXX
Generating 3 configs for Japan
wrote config for Japan at /tmp/NordVPN Wireguard/NordVPN Japan #673.conf
wrote config for Japan at /tmp/NordVPN Wireguard/NordVPN Japan #517.conf
wrote config for Japan at /tmp/NordVPN Wireguard/NordVPN Japan #754.conf
```

#### Options

- `--country`, `-c`: Specify the country code(s) (ISO 3166-1 alpha-2 code) for which to generate the configuration. For example, `US` for the United States. `DE,JP` for Germany and Japan.
- `--wireguard-privatekey`, `--pk`: Your WireGuard private key.
- `--token`, `-t`: NordVPN access token, used to fetch the private key from the NordVPN API. Defaults to the `NORDVPN_TOKEN` env var.
- `--nordvpn-accountid`, `--id`: Account ID of the NordVPN keychain entry. Only needed if the keychain has more than one NordVPN account.
- `--dns-server`, `--dns`: Specify the DNS server to use in the configuration. Defaults to `103.86.96.100`.
- `--amount`, `-a`: The number of configurations to generate for the specified country. Defaults to `1`.
- `--all-countries`: Generate configurations for all available countries.
- `--outdir`, `-o`: The output directory for the generated configuration files. Defaults to the current working directory.

#### Generating a Single Configuration

To generate a configuration for a specific country with your WireGuard private key:

```bash
npx generate-nordvpn-wgconf --country US --wireguard-privatekey YOUR_PRIVATE_KEY --outdir /path/to/output/dir
```

#### Generating Multiple Configurations

To generate multiple configurations for a specific country:

```bash
npx generate-nordvpn-wgconf --country US --wireguard-privatekey YOUR_PRIVATE_KEY --amount 5 --outdir /path/to/output/dir
```

#### Generating Configurations for All Countries

To generate configurations for all available countries:

```bash
npx generate-nordvpn-wgconf --all-countries --wireguard-privatekey YOUR_PRIVATE_KEY --outdir /path/to/output/dir
```

#### Generating Configurations for 2 Countries

To generate configurations for all available countries:

```bash
npx generate-nordvpn-wgconf --country JP,DE --wireguard-privatekey YOUR_PRIVATE_KEY --outdir /path/to/output/dir
```

### Contributing

Contributions are welcome. Please open an issue or submit a pull request with your improvements.

### License

MIT
