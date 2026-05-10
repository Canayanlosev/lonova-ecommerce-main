using MegaERP.Modules.IAM.Core.Entities;

namespace MegaERP.Modules.IAM.Core.Interfaces;

public interface IJwtProvider
{
    string Generate(ApplicationUser user);
}
