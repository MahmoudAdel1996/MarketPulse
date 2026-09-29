namespace MarketPulse.Api.Startup;

/// <summary>
/// Loads a local .env file into process environment variables, so ASP.NET Core's
/// built-in environment-variable configuration provider (which reads "__" as a
/// section separator, e.g. AUTHENTICATION__GOOGLE__CLIENTID) picks them up.
/// Real environment variables always win; .env is dev convenience only.
/// </summary>
public static class DotEnvLoader
{
    public static void Load()
    {
        var directory = new DirectoryInfo(Directory.GetCurrentDirectory());
        for (var i = 0; i < 5 && directory is not null; i++, directory = directory.Parent)
        {
            var path = Path.Combine(directory.FullName, ".env");
            if (!File.Exists(path))
            {
                continue;
            }

            foreach (var line in File.ReadAllLines(path))
            {
                var trimmed = line.Trim();
                if (trimmed.Length == 0 || trimmed.StartsWith('#'))
                {
                    continue;
                }

                var separatorIndex = trimmed.IndexOf('=');
                if (separatorIndex <= 0)
                {
                    continue;
                }

                var key = trimmed[..separatorIndex].Trim();
                var value = trimmed[(separatorIndex + 1)..].Trim().Trim('"');

                if (Environment.GetEnvironmentVariable(key) is null)
                {
                    Environment.SetEnvironmentVariable(key, value);
                }
            }

            return;
        }
    }
}
