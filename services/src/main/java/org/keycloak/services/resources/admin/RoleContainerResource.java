package org.keycloak.services.resources.admin;

import org.jboss.resteasy.annotations.cache.NoCache;
import org.keycloak.models.Constants;
import org.keycloak.models.RoleContainerModel;
import org.keycloak.models.RoleModel;
import org.keycloak.representations.idm.RoleRepresentation;
import org.keycloak.services.resources.flows.Flows;

import javax.ws.rs.*;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.UriInfo;
import java.util.ArrayList;
import java.util.List;

/**
 * @author <a href="mailto:bill@burkecentral.com">Bill Burke</a>
 * @version $Revision: 1 $
 */
public class RoleContainerResource {
    protected RoleContainerModel roleContainer;

    public RoleContainerResource(RoleContainerModel roleContainer) {
        this.roleContainer = roleContainer;
    }

    @Path("roles")
    @GET
    @NoCache
    @Produces("application/json")
    public List<RoleRepresentation> getRoles() {
        List<RoleModel> roleModels = roleContainer.getRoles();
        List<RoleRepresentation> roles = new ArrayList<RoleRepresentation>();
        for (RoleModel roleModel : roleModels) {
            if (!roleModel.getName().startsWith(Constants.INTERNAL_ROLE)) {
                RoleRepresentation role = new RoleRepresentation(roleModel.getName(), roleModel.getDescription());
                role.setId(roleModel.getId());
                roles.add(role);
            }
        }
        return roles;
    }

    @Path("roles/{id}")
    @GET
    @NoCache
    @Produces("application/json")
    public RoleRepresentation getRole(final @PathParam("id") String id) {
        RoleModel roleModel = roleContainer.getRoleById(id);
        if (roleModel == null || roleModel.getName().startsWith(Constants.INTERNAL_ROLE)) {
            throw new NotFoundException();
        }
        RoleRepresentation rep = new RoleRepresentation(roleModel.getName(), roleModel.getDescription());
        rep.setId(roleModel.getId());
        return rep;
    }

    @Path("roles/{id}")
    @DELETE
    @NoCache
    public void deleteRole(final @PathParam("id") String id) {
        if (!roleContainer.removeRole(id)) {
            throw new NotFoundException();
        }
    }

    @Path("roles/{id}")
    @PUT
    @Consumes("application/json")
    public void updateRole(final @PathParam("id") String id, final RoleRepresentation rep) {
        RoleModel role = roleContainer.getRoleById(id);
        if (role == null || role.getName().startsWith(Constants.INTERNAL_ROLE)) {
            throw new NotFoundException();
        }
        role.setName(rep.getName());
        role.setDescription(rep.getDescription());
    }

    @Path("roles")
    @POST
    @Consumes("application/json")
    public Response createRole(final @Context UriInfo uriInfo, final RoleRepresentation rep) {
        if (roleContainer.getRole(rep.getName()) != null || rep.getName().startsWith(Constants.INTERNAL_ROLE)) {
            return Flows.errors().exists("Role with name " + rep.getName() + " already exists");
        }
        RoleModel role = roleContainer.addRole(rep.getName());
        if (role == null) {
            throw new NotFoundException();
        }
        role.setDescription(rep.getDescription());
        return Response.created(uriInfo.getAbsolutePathBuilder().path(role.getId()).build()).build();
    }
}
