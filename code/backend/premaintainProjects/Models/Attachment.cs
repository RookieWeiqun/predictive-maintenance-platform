using System;
using System.Collections.Generic;

namespace premaintainProjects.Models;

public partial class Attachment
{
    public Guid Attaid { get; set; }

    public Guid Taskitemid { get; set; }

    public string Filepath { get; set; } = null!;
}
